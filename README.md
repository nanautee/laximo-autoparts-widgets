# Autoparts Widgets — Laximo + ABCP

Виджеты подбора автозапчастей по VIN и OEM-номеру с интеграцией Laximo
(каталог) и ABCP (корзина). Референс-проект для клиента: один backend-normalised
API, три embeddable-виджета на чистом TypeScript без фреймворков.

Демо работает в режиме `mock` на встроенных фикстурах — платные ключи Laximo
не нужны, чтобы посмотреть интерфейс.

```
laximo-autoparts-widgets/
├─ backend/        Spring Boot 3 · WebFlux · Redis · springdoc
└─ frontend/       Vite · TypeScript · zero runtime dependencies
```

## Что умеет

**Backend** — единственная точка входа для Laximo и ABCP:

| Endpoint | Назначение | TTL |
|---|---|---|
| `GET /api/v1/vehicles/decode?vin=` | карточка авто + корень дерева деталей | 3 дня |
| `GET /api/v1/vehicles/{id}/catalog?groupId=` | один уровень дерева деталей | 7 дней |
| `GET /api/v1/catalog/brands?q=` | бренды, серверный поиск | 30 дней |
| `GET /api/v1/catalog/brands/{id}/models` | модели бренда | 14 дней |
| `GET /api/v1/catalog/models/{id}/modifications` | модификации по годам | 14 дней |
| `GET /api/v1/oem/search?number=` | OEM → кроссы, цены, применимость | 6 часов |
| `POST /api/v1/cart/add` | сборка тела запроса в ABCP | — |
| `GET /api/v1/meta` | активный режим, TTL, тестовые VIN/OEM | — |

Swagger: `/swagger-ui.html`, OpenAPI JSON: `/api-docs`, health: `/actuator/health`.

**Frontend** — три виджета (`vin`, `catalog`, `oem`), плавающая корзина,
embed-API `window.AutopartsWidgets` и showcase-страница `index.html`.

## Режимы

| Переменная | `mock` (по умолчанию) | `live` |
|---|---|---|
| `MOCK_ENABLED` | `true` | `false` |
| Данные каталога | встроенные фикстуры | Laximo SOAP API |
| `CART_MODE` / ключи ABCP | `simulated` — показывается собранное тело запроса | реальная отправка |

Демо специально показывает `mode: simulated` в ответе корзины: так видно
точное тело, которое уйдёт в ABCP, и можно сверить его с тестовым стендом
клиента, не подменяя трафик.

## Локальный запуск

```bash
cp .env.example .env      # необязательно: дефолты рабочие
docker compose up --build
```

- backend: http://localhost:8080
- Swagger: http://localhost:8080/swagger-ui.html

Фронтенд отдельно:

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173
```

Если фронтенд на другом порту, укажите адрес backend:

```bash
VITE_API_BASE=http://localhost:8080 npm run dev
```

## Переменные окружения

Все параметры читаются из окружения, дефолты подходят для демо.

| Переменная | Дефолт | Смысл |
|---|---|---|
| `MOCK_ENABLED` | `true` | фикстуры вместо Laximo |
| `CACHE_ENABLED` | `true` | Redis-кэш |
| `CACHE_TTL_VIN` | `72h` | TTL декодирования VIN |
| `CACHE_TTL_BRANDS` | `720h` | TTL брендов |
| `CACHE_TTL_MODELS` | `336h` | TTL моделей |
| `CACHE_TTL_MODS` | `336h` | TTL модификаций |
| `CACHE_TTL_CATALOG` | `168h` | TTL дерева деталей |
| `CACHE_TTL_CROSS` | `6h` | TTL кроссов по OEM |
| `CACHE_PREFIX` | `autoparts:` | префикс ключей Redis |
| `LAXIMO_URL` | — | endpoint WSDL Laximo |
| `LAXIMO_TRADE_ID` / `LAXIMO_USERNAME` / `LAXIMO_PASSWORD` | — | доступы Laximo |
| `LAXIMO_MARKET` | `RU` | рынок Laximo |
| `ABCP_URL` | — | адрес API магазина |
| `ABCP_LOGIN` / `ABCP_PASSWORD` | — | доступы ABCP |
| `VITE_API_BASE` | — | адрес backend для фронтенда |

## Почему Redis

Laximo тарифицируется по запросу. Один и тот же VIN запрашивается десятки раз
за сессию покупателя, а справочники брендов и моделей меняются раз в месяцы.
Поэтому ответы кэшируются по namespace с разным TTL, а каждый ответ несёт
`X-Cache: HIT | MISS | BYPASS` и `meta.cache` — поведение кэша видно в
Swagger и в UI виджета. Отказ Redis не ломает виджет: запрос уходит напрямую
к upstream со статусом `BYPASS`.

## Тесты

```bash
cd backend
mvn test                  # 13 тестов: нормализация VIN/OEM, целостность фикстур
cd frontend && npm run typecheck
```

## Deploy

**Backend (Railway):** Dockerfile в `backend/`, порт `8080`, healthcheck
`/actuator/health`. Переменные — см. таблицу выше; в демо
`MOCK_ENABLED=true`.

**Frontend (GitHub Pages):** workflow `.github/workflows/pages.yml` собирает
`frontend` и публикует `dist`. Адрес backend передаётся через
`VITE_API_BASE`.

## Ограничения

- Без ключей Laximo используются фикстуры, а ответ `/api/v1/cart/add`
  возвращает `mode: simulated`.
- Имена SOAP-операций Laximo и формат ответа ABCP нужно сверить с WSDL и
  документацией заказчика — они зависят от market и версии сервиса.
- Цена в корзине приходит от клиента как подсказка; окончательную цену и
  наличие считает сам ABCP.

## Лицензия

MIT — см. [LICENSE](LICENSE).
