package com.autoparts.hub.mock;

import com.autoparts.hub.dto.CatalogNode;
import com.autoparts.hub.dto.OemSearchResult;
import com.autoparts.hub.dto.Vehicle;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Realistic fixture data for mock mode: decoded vehicles, a parts tree with
 * OEM numbers, and a cross-reference index for the OEM lookup widget.
 */
final class Fixtures {

    private Fixtures() {
    }

    static final List<Vehicle> VEHICLES = List.of(
            vehicle("VF-318I-2008", "BMW", "3 series (E90/E91)", "320i sedan, petrol 2.0", 2008, "N46B20",
                    "Petrol", "Manual", "Rear", "Saloon", "110 kW (150 hp)", "DE",
                    "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=640&q=80", "PL31"),
            vehicle("VF-325I-2011", "BMW", "3 series (E90/E91)", "325i sedan, petrol 2.5", 2011, "N52B25",
                    "Petrol", "Automatic", "Rear", "Saloon", "160 kW (218 hp)", "DE",
                    "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=640&q=80", "PL31"),
            vehicle("VF-320D-2010", "BMW", "3 series (E90/E91)", "320d sedan, diesel 2.0", 2010, "M47D20",
                    "Diesel", "Automatic", "Rear", "Saloon", "135 kW (184 hp)", "DE",
                    "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=640&q=80", "PL32"),
            vehicle("VF-X530D-2009", "BMW", "X5 (E70)", "xDrive30d, diesel 3.0", 2009, "M57D30",
                    "Diesel", "Automatic", "All wheel drive", "SUV", "210 kW (286 hp)", "DE",
                    "https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=640&q=80", "PL41"),
            vehicle("VF-C200-2012", "Mercedes-Benz", "C-class (W204)", "C200 CGI coupe, petrol 2.0", 2012, "M271DE20",
                    "Petrol", "Automatic", "Rear", "Coupe", "135 kW (184 hp)", "DE",
                    "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=640&q=80", "R172"),
            vehicle("VF-GOLF14-2010", "Volkswagen", "Golf V", "1.4 TSI petrol", 2010, "CAVAXS",
                    "Petrol", "Manual", "Front", "Hatchback", "92 kW (125 hp)", "DE",
                    "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=640&q=80", "PQ35"),
            vehicle("VF-CAMRY20-2014", "Toyota", "Camry (XV50)", "2.0 petrol", 2014, "2AR-FE",
                    "Petrol", "Automatic", "Front", "Saloon", "110 kW (150 hp)", "JP",
                    "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=640&q=80", "XV50"),
            vehicle("VF-VESTA16-2016", "Lada", "Vesta", "1.6 petrol", 2016, "VAZ-21129",
                    "Petrol", "Manual", "Front", "Sedan", "90 kW (122 hp)", "RU",
                    "https://images.unsplash.com/photo-1590362891991-f776e747a588?w=640&q=80", "VAZ-2112"),
            vehicle("VF-OCT20-2015", "Skoda", "Octavia III", "2.0 TDI diesel", 2015, "CJZA",
                    "Diesel", "Automatic", "Front", "Liftback", "110 kW (150 hp)", "CZ",
                    "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=640&q=80", "5E"),
            vehicle("VF-A420-2011", "Audi", "A4 (B8)", "2.0 TFSI petrol", 2011, "EA888",
                    "Petrol", "Automatic", "Front", "Sedan", "132 kW (180 hp)", "DE",
                    "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=640&q=80", "B8"));

    /** Test VINs supplied with the brief, plus well-known public VINs. */
    static final Map<String, Vehicle> VIN_INDEX = new LinkedHashMap<>();

    static {
        VIN_INDEX.put("WBAVA51070FH12345", VEHICLES.get(0));
        VIN_INDEX.put("WBAVA51050FH54321", VEHICLES.get(1));
        VIN_INDEX.put("WBA8B11060F123456", VEHICLES.get(2));
        VIN_INDEX.put("WBAXU7100F0L12345", VEHICLES.get(3));
        VIN_INDEX.put("WDD2050548L123456", VEHICLES.get(4));
        VIN_INDEX.put("WVWZZZ1KZAW000001", VEHICLES.get(5));
        VIN_INDEX.put("JTNB11HK303012345", VEHICLES.get(6));
        VIN_INDEX.put("X4LSSABAAEN123456", VEHICLES.get(7));
        VIN_INDEX.put("TMBJJ7NE0K0123456", VEHICLES.get(8));
        VIN_INDEX.put("WAUZZZ8V0DA123456", VEHICLES.get(9));
        VIN_INDEX.put("XW8ZZZ5L7JG000001", VEHICLES.get(8));
        VIN_INDEX.put("KMHL14JA1MA123456", VEHICLES.get(6));
    }

    static List<Vehicle> vehicles() {
        return VEHICLES;
    }

    private static Vehicle vehicle(String id, String brand, String model, String modification, int year,
                                   String engine, String fuel, String gearbox, String drive, String body,
                                   String power, String country, String image, String platform) {
        return new Vehicle(id, null, brand, model, modification, year, engine, fuel, gearbox, drive, body, power,
                country, "RU", image, List.of(platform));
    }

    // ---------------------------------------------------------------------
    // Parts tree
    // ---------------------------------------------------------------------

    static Map<String, List<CatalogNode>> catalog(String vehicleId) {
        int factor = priceFactor(vehicleId);
        Map<String, List<CatalogNode>> tree = new LinkedHashMap<>();

        tree.put("root", List.of(
                group("g-engine", "Двигатель и трансмиссия", "Engine & transmission"),
                group("g-susp", "Подвеска и ходовая часть", "Suspension & running gear"),
                group("g-brake", "Тормозная система", "Brake system"),
                group("g-body", "Кузов, двери и стёкла", "Body, doors & glass"),
                group("g-elec", "Электроника и двигатель", "Electrics & engine management"),
                group("g-service", "Расходники и регламентное ТО", "Consumables & service")));

        tree.put("g-engine", List.of(
                group("g-engine-head", "Головка блока и ГРМ", "Cylinder head & timing"),
                group("g-engine-timing", "Цепь и ремень ГРМ", "Timing belt / chain"),
                group("g-engine-mounts", "Опоры двигателя", "Engine mounts")));

        tree.put("g-engine-head", List.of(
                group("g-engine-head-parts", "Детали ГБЦ", "Cylinder head parts"),
                group("g-engine-head-gasket", "Прокладка ГБЦ", "Cylinder head gasket")));
        tree.put("g-engine-head-parts", List.of(
                part("p-head-gasket", "Прокладка ГБЦ", "11127529817", 2_450, true, factor),
                part("p-head-valve", "Клапан впускной", "11120032237", 890, true, factor),
                part("p-head-cover", "Крышка клапанов", "11127553445", 5_320, true, factor),
                part("p-head-bolt", "Болт крепления ГБЦ", "11127553446", 210, true, factor)));
        tree.put("g-engine-head-gasket", List.of(
                part("p-gasket-hd", "Прокладка ГБЦ (комплект)", "11127529817", 2_450, true, factor),
                part("p-gasket-vw", "Прокладка ГБЦ VAG", "06A103383AD", 3_100, false, factor)));

        tree.put("g-engine-timing", List.of(
                group("g-engine-timing-parts", "Комплекты ГРМ", "Timing kits"),
                group("g-engine-timing-tensioner", "Натяжители и ролики", "Tensioners & idlers")));
        tree.put("g-engine-timing-parts", List.of(
                part("p-timing-kit", "Комплект ГРМ с помпой", "11318685091", 8_900, true, factor),
                part("p-timing-belt", "Ремень ГРМ", "11226885302", 2_180, true, factor),
                part("p-timing-pump", "Помпа системы охлаждения", "11538686961", 3_740, true, factor),
                part("p-timing-tensioner", "Натяжитель ремня", "11318685092", 1_960, false, factor)));
        tree.put("g-engine-timing-tensioner", List.of(
                part("p-tensioner", "Натяжитель ремня ГРМ", "11318685092", 1_960, false, factor),
                part("p-idler", "Обводной ролик", "11318685093", 1_240, true, factor)));

        tree.put("g-engine-mounts", List.of(
                group("g-engine-mounts-parts", "Опоры и сайлентблоки", "Mounts & bushes")));
        tree.put("g-engine-mounts-parts", List.of(
                part("p-mount-right", "Опора двигателя правая", "31316780917", 2_640, true, factor),
                part("p-mount-left", "Опора двигателя левая", "31316781822", 2_640, false, factor),
                part("p-mount-diff", "Опора КПП", "24106715903", 3_180, true, factor)));

        tree.put("g-susp", List.of(
                group("g-susp-shock", "Амортизаторы и пружины", "Shocks & springs"),
                group("g-susp-control", "Рычаги и сайлентблоки", "Control arms & bushes")));
        tree.put("g-susp-shock", List.of(
                group("g-susp-shock-parts", "Амортизаторы", "Shock absorbers"),
                group("g-susp-shock-mounts", "Опоры амортизаторов", "Strut mounts")));
        tree.put("g-susp-shock-parts", List.of(
                part("p-shock-front", "Амортизатор передний", "33526785715", 7_450, true, factor),
                part("p-shock-rear", "Амортизатор задний", "33526787920", 6_980, true, factor),
                part("p-spring-front", "Пружина передняя", "31316786715", 3_260, true, factor),
                part("p-spring-rear", "Пружина задняя", "33526786715", 2_990, false, factor)));
        tree.put("g-susp-shock-mounts", List.of(
                part("p-strut-mount", "Опора амортизатора", "31316781046", 2_150, true, factor),
                part("p-strut-bearing", "Подшипник опоры", "31316781047", 890, true, factor)));

        tree.put("g-susp-control", List.of(
                group("g-susp-control-parts", "Рычаги подвески", "Control arms"),
                group("g-susp-control-bushes", "Сайлентблоки", "Control arm bushes")));
        tree.put("g-susp-control-parts", List.of(
                part("p-arm-front-l", "Рычаг передний левый", "31126784607", 6_430, true, factor),
                part("p-arm-front-r", "Рычаг передний правый", "31126784608", 6_430, true, factor),
                part("p-arm-rear", "Рычаг задний", "33526785034", 5_870, false, factor)));
        tree.put("g-susp-control-bushes", List.of(
                part("p-bush-front", "Сайлентблок рычага", "31126754380", 740, true, factor),
                part("p-bush-rear", "Сайлентблок задний", "33526785035", 680, true, factor)));

        tree.put("g-brake", List.of(
                group("g-brake-front", "Передняя тормозная система", "Front brake system"),
                group("g-brake-rear", "Задняя тормозная система", "Rear brake system")));
        tree.put("g-brake-front", List.of(
                group("g-brake-front-discs", "Диски и колодки", "Discs & pads"),
                group("g-brake-front-caliper", "Суппорты", "Calipers")));
        tree.put("g-brake-front-discs", List.of(
                part("p-pad-front", "Колодки тормозные передние", "34216773269", 3_450, true, factor),
                part("p-disc-front", "Диск тормозной передний", "34116794330", 4_870, true, factor),
                part("p-pad-front-ate", "Колодки ATE передние", "34216870690", 5_600, true, factor),
                part("p-disc-front-textar", "Диск TEXTAR передний", "34116862767", 3_990, false, factor)));
        tree.put("g-brake-front-caliper", List.of(
                part("p-caliper-front-l", "Суппорт тормозной левый", "34116785618", 12_400, false, factor),
                part("p-caliper-repair", "Ремкомплект суппорта", "34116791045", 1_320, true, factor)));

        tree.put("g-brake-rear", List.of(
                group("g-brake-rear-parts", "Диски и колодки", "Discs & pads"),
                group("g-brake-rear-hydro", "Гидравлика", "Hydraulics")));
        tree.put("g-brake-rear-parts", List.of(
                part("p-pad-rear", "Колодки тормозные задние", "34216791870", 2_690, true, factor),
                part("p-disc-rear", "Диск тормозной задний", "34116860114", 3_240, true, factor)));
        tree.put("g-brake-rear-hydro", List.of(
                part("p-master-cylinder", "Главный тормозной цилиндр", "34116851005", 8_900, false, factor),
                part("p-brake-fluid", "Тормозная жидкость DOT4, 1 л", "000989254010", 320, true, factor)));

        tree.put("g-body", List.of(
                group("g-body-lights", "Освещение", "Lighting"),
                group("g-body-mirrors", "Зеркала и стеклоподъёмники", "Mirrors & regulators")));
        tree.put("g-body-lights", List.of(
                group("g-body-lights-parts", "Фары и лампы", "Headlights & bulbs"),
                group("g-body-lights-aux", "Противотуманные фары", "Fog lights")));
        tree.put("g-body-lights-parts", List.of(
                part("p-headlight-l", "Фара левая", "63117283425", 24_500, true, factor),
                part("p-headlight-r", "Фара правая", "63117283426", 24_500, true, factor),
                part("p-bulb-h4", "Лампа галоген H4 60/55W", "000979002575", 240, true, factor),
                part("p-led-h7", "Лампа LED H7", "000979001180", 890, true, factor)));
        tree.put("g-body-lights-aux", List.of(
                part("p-fog-l", "Противотуманная фара левая", "63117303905", 6_700, true, factor),
                part("p-fog-r", "Противотуманная фара правая", "63117303906", 6_700, false, factor)));

        tree.put("g-body-mirrors", List.of(
                group("g-body-mirrors-parts", "Зеркала", "Mirrors"),
                group("g-body-mirrors-regulators", "Стеклоподъёмники", "Window regulators")));
        tree.put("g-body-mirrors-parts", List.of(
                part("p-mirror-l", "Зеркало левое", "51167252525", 7_900, true, factor),
                part("p-mirror-r", "Зеркало правое", "51167252526", 7_900, true, factor),
                part("p-mirror-glass", "Стекло зеркала", "51167183645", 890, true, factor)));
        tree.put("g-body-mirrors-regulators", List.of(
                part("p-regulator-l", "Стеклоподъёмник левый", "51167229470", 1_650, true, factor),
                part("p-regulator-r", "Стеклоподъёмник правый", "51167229471", 1_650, false, factor)));

        tree.put("g-elec", List.of(
                group("g-elec-battery", "Аккумулятор и зарядка", "Battery & charging"),
                group("g-elec-sensors", "Датчики", "Sensors"),
                group("g-elec-modules", "Блоки управления", "Control units")));
        tree.put("g-elec-battery", List.of(
                group("g-elec-battery-parts", "Аккумуляторы", "Batteries"),
                group("g-elec-battery-alternator", "Генератор и регулятор", "Alternator")));
        tree.put("g-elec-battery-parts", List.of(
                part("p-battery-90", "Аккумулятор 90Ah", "000915105CE", 11_400, true, factor),
                part("p-battery-100", "Аккумулятор AGM 100Ah", "000915105DA", 19_800, true, factor),
                part("p-terminal-kit", "Комплект клемм АКБ", "00091510001", 690, true, factor)));
        tree.put("g-elec-battery-alternator", List.of(
                part("p-alternator", "Генератор 140A", "12317605459", 21_700, false, factor),
                part("p-regulator", "Регулятор напряжения", "12317621204", 3_450, true, factor)));

        tree.put("g-elec-sensors", List.of(
                group("g-elec-sensors-parts", "Датчики температуры", "Temperature sensors"),
                group("g-elec-sensors-o2", "Датчики кислорода", "Oxygen sensors")));
        tree.put("g-elec-sensors-parts", List.of(
                part("p-sensor-coolant", "Датчик температуры охлаждающей жидкости", "13628583527", 780, true, factor),
                part("p-sensor-throttle", "Датчик дроссельной заслонки", "13547515908", 1_650, true, factor),
                part("p-sensor-crankshaft", "Датчик положения вала", "13628572899", 2_100, false, factor)));
        tree.put("g-elec-sensors-o2", List.of(
                part("p-o2-upstream", "Датчик кислорода до катализатора", "13628583724", 4_350, true, factor),
                part("p-o2-downstream", "Датчик кислорода после катализатора", "13628583725", 3_780, true, factor)));

        tree.put("g-elec-modules", List.of(
                part("p-ecu-engine", "Блок управления двигателем", "13547552107", 32_000, false, factor),
                part("p-ecu-body", "Блок управления кузовом", "15718660719", 18_400, false, factor)));

        tree.put("g-service", List.of(
                group("g-service-fluids", "Масла и жидкости", "Oils & fluids"),
                group("g-service-filters", "Фильтры", "Filters")));
        tree.put("g-service-fluids", List.of(
                group("g-service-fluids-parts", "Моторное масло", "Engine oil"),
                group("g-service-fluids-other", "Спецжидкости", "Special fluids")));
        tree.put("g-service-fluids-parts", List.of(
                part("p-oil-5w30-4", "Масло моторное 5W-30 4 л", "000989201051", 2_650, true, factor),
                part("p-oil-5w30-1", "Масло моторное 5W-30 1 л", "000989201053", 720, true, factor),
                part("p-oil-0w30-4", "Масло моторное 0W-30 4 л", "000989300437", 3_490, false, factor)));
        tree.put("g-service-fluids-other", List.of(
                part("p-coolant-1", "Охлаждающая жидкость 1 л", "000989301017", 480, true, factor),
                part("p-adblue-5", "AdBlue 5 л", "000979002110", 690, true, factor),
                part("p-brake-fluid-1", "Тормозная жидкость DOT4 1 л", "000989254010", 320, true, factor)));
        tree.put("g-service-filters", List.of(
                group("g-service-filters-parts", "Фильтры двигателя", "Engine filters"),
                group("g-service-filters-cabin", "Фильтры салона", "Cabin filters")));
        tree.put("g-service-filters-parts", List.of(
                part("p-filter-oil", "Масляный фильтр", "11427575945", 620, true, factor),
                part("p-filter-air", "Воздушный фильтр", "13717533603", 890, true, factor),
                part("p-filter-fuel", "Топливный фильтр", "13327811223", 740, true, factor),
                part("p-filter-air-mann", "Воздушный фильтр MANN", "13717604511", 1_150, true, factor)));
        tree.put("g-service-filters-cabin", List.of(
                part("p-filter-cabin", "Фильтр салона угольный", "64119207955", 560, true, factor),
                part("p-filter-cabin-fram", "Фильтр салона FRAM", "64119178405", 690, false, factor)));

        return tree;
    }

    // ---------------------------------------------------------------------
    // OEM cross reference index
    // ---------------------------------------------------------------------

    static final Map<String, OemSearchResult> OEM_INDEX = new LinkedHashMap<>();

    static {
        OEM_INDEX.put("34116860114", new OemSearchResult("34116860114", "BMW", "Диск тормозной задний",
                "34116860114", "Тормозная система", "Оригинальный номер BMW",
                List.of(
                        new OemSearchResult.CrossPart("34116860114", "BMW", "Диск тормозной задний", 6_240, "RUB", true, true, "Original"),
                        new OemSearchResult.CrossPart("34216862999", "ATE", "Диск тормозной задний", 4_980, "RUB", true, false, "ATE"),
                        new OemSearchResult.CrossPart("34116860115", "Brembo", "Диск тормозной задний вентилируемый", 5_450, "RUB", true, false, "Brembo"),
                        new OemSearchResult.CrossPart("BD-14235", "FEAD", "Диск тормозной задний", 3_990, "RUB", false, false, "FEAD")),
                List.of(
                        new OemSearchResult.Applicability("BMW", "3 series (E90/E91)", "320i sedan, petrol 2.0", "2005-2008", null),
                        new OemSearchResult.Applicability("BMW", "3 series (E90/E91)", "325i sedan, petrol 2.5", "2005-2008", null),
                        new OemSearchResult.Applicability("BMW", "1 series (E87)", "116i petrol", "2004-2007", "Проверьте типоразмер")),
                3_990, "RUB"));

        OEM_INDEX.put("34216870690", new OemSearchResult("34216870690", "ATE", "Колодки тормозные передние",
                "34216870690", "Тормозная система", "Remanufactured by ATE",
                List.of(
                        new OemSearchResult.CrossPart("34216870690", "ATE", "Колодки тормозные передние", 5_600, "RUB", true, false, "ATE"),
                        new OemSearchResult.CrossPart("34216773269", "BMW", "Колодки тормозные передние", 3_450, "RUB", true, true, "Original"),
                        new OemSearchResult.CrossPart("34216871234", "TRW", "Колодки тормозные передние GDB3332", 3_980, "RUB", true, false, "TRW"),
                        new OemSearchResult.CrossPart("34216875555", "Brembo", "Колодки тормозные передние", 6_750, "RUB", false, false, "Brembo")),
                List.of(
                        new OemSearchResult.Applicability("BMW", "3 series (E90/E91)", "320i sedan, petrol 2.0", "2005-2008", null),
                        new OemSearchResult.Applicability("BMW", "3 series (E90/E91)", "318d sedan, diesel 2.0", "2005-2008", null),
                        new OemSearchResult.Applicability("BMW", "X1 (E84)", "xDrive20d", "2009-2012", "Только для моделей с кодом L01")),
                3_450, "RUB"));

        OEM_INDEX.put("11427575945", new OemSearchResult("11427575945", "BMW", "Масляный фильтр",
                "11427575945", "Расходники и ТО", "Оригинальный фильтр",
                List.of(
                        new OemSearchResult.CrossPart("11427575945", "BMW", "Масляный фильтр", 890, "RUB", true, true, "Original"),
                        new OemSearchResult.CrossPart("HU7007z", "MANN-FILTER", "Масляный фильтр", 540, "RUB", true, false, "MANN"),
                        new OemSearchResult.CrossPart("OX133/1D", "FRAM", "Масляный фильтр", 480, "RUB", true, false, "FRAM"),
                        new OemSearchResult.CrossPart("6135620", "FILTRON", "Масляный фильтр", 620, "RUB", false, false, "FILTRON")),
                List.of(
                        new OemSearchResult.Applicability("BMW", "3 series (E90/E91)", "320i sedan, petrol 2.0", "2005-2011", null),
                        new OemSearchResult.Applicability("BMW", "5 series (F10)", "520i sedan, petrol 2.0", "2010-2013", null),
                        new OemSearchResult.Applicability("MINI", "Cooper", "1.6 petrol", "2007-2013", "Проверьте резьбу")),
                480, "RUB"));

        OEM_INDEX.put("000915105CE", new OemSearchResult("000915105CE", "BMW", "Аккумулятор 90Ah",
                "000915105CE", "Электроника и двигатель", "Снятый с производства",
                List.of(
                        new OemSearchResult.CrossPart("000915105CE", "BMW", "Аккумулятор 90Ah", 11_400, "RUB", true, true, "Original"),
                        new OemSearchResult.CrossPart("000915105DE", "Varta", "Аккумулятор 90Ah", 9_800, "RUB", true, false, "Varta"),
                        new OemSearchResult.CrossPart("000915105CG", "Bosch", "Аккумулятор 90Ah", 8_950, "RUB", true, false, "Bosch")),
                List.of(
                        new OemSearchResult.Applicability("BMW", "3 series (E90/E91)", "320i sedan, petrol 2.0", "2005-2008", null),
                        new OemSearchResult.Applicability("BMW", "X5 (E70)", "xDrive30d, diesel 3.0", "2007-2013", "Проверьте посадочное место")),
                8_950, "RUB"));

        OEM_INDEX.put("11127529817", new OemSearchResult("11127529817", "BMW", "Прокладка ГБЦ",
                "11127529817", "Двигатель и трансмиссия", "Прокладка головки блока",
                List.of(
                        new OemSearchResult.CrossPart("11127529817", "BMW", "Прокладка ГБЦ", 2_450, "RUB", true, true, "Original"),
                        new OemSearchResult.CrossPart("11127529818", "Victor Reinz", "Прокладка ГБЦ", 1_780, "RUB", true, false, "Victor Reinz"),
                        new OemSearchResult.CrossPart("06A103383AD", "VAG", "Прокладка ГБЦ", 1_350, "RUB", false, false, "VAG")),
                List.of(
                        new OemSearchResult.Applicability("BMW", "3 series (E90/E91)", "320i sedan, petrol 2.0", "2005-2008", "Двигатель N46/N43"),
                        new OemSearchResult.Applicability("BMW", "1 series (E87)", "118i petrol", "2004-2007", "Двигатель N46")),
                1_350, "RUB"));
    }

    /** Fallback for OEM numbers that are not in the curated index. */
    static OemSearchResult genericOemResult(String oem) {
        String normalized = oem.replaceAll("[^A-Za-z0-9]", "").toUpperCase(Locale.ROOT);
        String brand = guessBrand(normalized);
        String display = oem.toUpperCase(Locale.ROOT);
        List<OemSearchResult.CrossPart> crosses = new ArrayList<>();
        crosses.add(new OemSearchResult.CrossPart(display, brand, "Деталь по номеру " + display,
                1_500, "RUB", true, true, "Original"));
        crosses.add(new OemSearchResult.CrossPart(normalized + "A", brand, "Аналог (замена) " + display,
                980, "RUB", true, false, "Noname"));
        crosses.add(new OemSearchResult.CrossPart(normalized + "B", "TRW", "Аналог premium " + display,
                1_320, "RUB", true, false, "TRW"));
        return new OemSearchResult(display, brand, "Деталь по номеру " + display,
                null, "Не определена", "Номер не найден в демо-индексе, показана типовая выдача",
                crosses,
                List.of(new OemSearchResult.Applicability("Универсально", "—", "—", "—",
                        "Применимость уточняется по VIN")),
                980, "RUB");
    }

    private static String guessBrand(String normalizedOem) {
        char first = normalizedOem.isEmpty() ? 'X' : normalizedOem.charAt(0);
        if (first >= '0' && first <= '9') {
            return "BMW";
        }
        return "OEM";
    }

    private static int priceFactor(String vehicleId) {
        int hash = vehicleId == null ? 7 : vehicleId.hashCode();
        return 85 + Math.floorMod(hash, 40);
    }

    /**
     * Groups intentionally carry no children: widgets load a level at a time,
     * which keeps payloads small on big catalogs.
     */
    private static CatalogNode group(String id, String name, String nameRu) {
        return new CatalogNode(id, CatalogNode.Kind.GROUP, name, nameRu, null, null, null, null, null, null, null,
                null, null, List.<CatalogNode>of());
    }

    private static CatalogNode part(String id, String name, String oem, int basePrice, boolean inStock, int factor) {
        int price = basePrice * factor / 100;
        return new CatalogNode(id, CatalogNode.Kind.PART, name, null, oem, null, null, price, "RUB", inStock,
                inStock ? 3 + (factor % 12) : 0, null, null, List.<CatalogNode>of());
    }
}
