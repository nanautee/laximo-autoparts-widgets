package com.autoparts.hub.mock;

import com.autoparts.hub.dto.Brand;
import com.autoparts.hub.dto.Modification;
import com.autoparts.hub.dto.Model;
import java.util.List;

/**
 * Static dictionaries used by the mock gateway. Small, but shaped exactly like
 * the Laximo responses so the frontend code is identical in both modes.
 */
final class Dictionaries {

    private Dictionaries() {
    }

    static final List<Brand> BRANDS = List.of(
            new Brand("L-201", "BMW", "DE"),
            new Brand("L-208", "Mercedes-Benz", "DE"),
            new Brand("L-216", "Volkswagen", "DE"),
            new Brand("L-224", "Toyota", "JP"),
            new Brand("L-231", "Ford", "US"),
            new Brand("L-238", "Hyundai", "KR"),
            new Brand("L-244", "Kia", "KR"),
            new Brand("L-251", "Lada", "RU"),
            new Brand("L-259", "Renault", "FR"),
            new Brand("L-263", "Skoda", "CZ"),
            new Brand("L-270", "Audi", "DE"),
            new Brand("L-277", "Nissan", "JP"));

    static final List<Model> MODELS = List.of(
            new Model("MD-3-series", "L-201", "3 series (E90/E91)", List.of(2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012), 14),
            new Model("MD-x5", "L-201", "X5 (E70)", List.of(2007, 2008, 2009, 2010, 2011, 2012, 2013), 11),
            new Model("MD-5-series", "L-201", "5 series (F10)", List.of(2010, 2011, 2012, 2013, 2014, 2015, 2016), 18),
            new Model("MD-c-class", "L-208", "C-class (W204)", List.of(2007, 2008, 2009, 2010, 2011, 2012), 9),
            new Model("MD-e-class", "L-208", "E-class (W212)", List.of(2009, 2010, 2011, 2012, 2013), 2),
            new Model("MD-golf", "L-216", "Golf V", List.of(2004, 2005, 2006, 2007, 2008, 2009), 16),
            new Model("MD-passat", "L-216", "Passat B7", List.of(2010, 2011, 2012, 2013), 10),
            new Model("MD-camry", "L-224", "Camry (XV50)", List.of(2012, 2013, 2014, 2015), 8),
            new Model("MD-focus", "L-231", "Focus II", List.of(2005, 2006, 2007, 2008, 2009, 2010), 7),
            new Model("MD-elantra", "L-238", "Elantra (HD)", List.of(2007, 2008, 2009, 2010, 2011), 6),
            new Model("MD-ceed", "L-244", "Ceed (ED)", List.of(2013, 2014, 2015, 2016), 5),
            new Model("MD-vesta", "L-251", "Vesta", List.of(2014, 2015, 2016, 2017), 4),
            new Model("MD-logan", "L-259", "Logan", List.of(2007, 2008, 2009, 2010, 2011, 2012), 6),
            new Model("MD-octavia", "L-263", "Octavia III", List.of(2013, 2014, 2015, 2016), 9),
            new Model("MD-a4", "L-270", "A4 (B8)", List.of(2008, 2009, 2010, 2011, 2012), 13),
            new Model("MD-qashqai", "L-277", "Qashqai (J10)", List.of(2007, 2008, 2009, 2010, 2011), 8));

    static final List<Modification> MODIFICATIONS = List.of(
            new Modification("VF-318i", "MD-3-series", "320i sedan, petrol 2.0", 2005, 2008, "N46B20", "Petrol", "Manual", "Rear", "Saloon", "110 kW (150 hp)", "PL31"),
            new Modification("VF-325i", "MD-3-series", "325i sedan, petrol 2.5", 2005, 2008, "N52B25", "Petrol", "Automatic", "Rear", "Saloon", "160 kW (218 hp)", "PL31"),
            new Modification("VF-318d", "MD-3-series", "318d sedan, diesel 2.0", 2005, 2008, "M47D20", "Diesel", "Manual", "Rear", "Saloon", "90 kW (122 hp)", "PL32"),
            new Modification("VF-320d", "MD-3-series", "320d sedan, diesel 2.0", 2005, 2008, "M47D20", "Diesel", "Automatic", "Rear", "Saloon", "135 kW (184 hp)", "PL32"),
            new Modification("VF-x530d", "MD-x5", "xDrive30d, diesel 3.0", 2007, 2010, "M57D30", "Diesel", "Automatic", "All wheel drive", "SUV", "210 kW (286 hp)", "PL41"),
            new Modification("VF-x535i", "MD-x5", "xDrive35i, petrol 3.0", 2008, 2013, "N55B30", "Petrol", "Automatic", "All wheel drive", "SUV", "225 kW (306 hp)", "PL41"),
            new Modification("VF-520i", "MD-5-series", "520i sedan, petrol 2.0", 2010, 2013, "N20B20", "Petrol", "Automatic", "Rear", "Saloon", "135 kW (184 hp)", "PL51"),
            new Modification("VF-523d", "MD-5-series", "523d sedan, diesel 2.2", 2011, 2014, "N57D22", "Diesel", "Automatic", "Rear", "Saloon", "140 kW (190 hp)", "PL52"),
            new Modification("VF-c200", "MD-c-class", "C200 CGI coupe, petrol 2.0", 2011, 2012, "M271DE20", "Petrol", "Automatic", "Rear", "Coupe", "135 kW (184 hp)", "R172"),
            new Modification("VF-c220", "MD-c-class", "C220 CDI, diesel 2.1", 2009, 2012, "OM651DE21", "Diesel", "Automatic", "Rear", "Saloon", "125 kW (170 hp)", "R171"),
        new Modification("VF-e300", "MD-e-class", "E300 petrol 3.5", 2009, 2013, "M272DE35", "Petrol", "Automatic", "Rear", "Saloon", "225 kW (306 hp)", "R212"),
        new Modification("VF-e350", "MD-e-class", "E350 CDI diesel 3.0", 2010, 2013, "M276DE35", "Diesel", "Automatic", "Rear", "Saloon", "225 kW (306 hp)", "R212"),
            new Modification("VF-golf14", "MD-golf", "1.4 TSI petrol", 2008, 2012, "CAVAXS", "Petrol", "Manual", "Front", "Hatchback", "92 kW (125 hp)", "PQ35"),
            new Modification("VF-golf20tdi", "MD-golf", "2.0 TDI diesel", 2008, 2012, "BKD", "Diesel", "Manual", "Front", "Hatchback", "103 kW (140 hp)", "PQ35"),
            new Modification("VF-p2tdi", "MD-passat", "2.0 TDI diesel", 2010, 2013, "CBDB", "Diesel", "Automatic", "Front", "Saloon", "110 kW (150 hp)", "PQ47"),
            new Modification("VF-camry20", "MD-camry", "2.0 petrol", 2012, 2015, "2AR-FE", "Petrol", "Automatic", "Front", "Saloon", "110 kW (150 hp)", "XV50"),
            new Modification("VF-focus20", "MD-focus", "2.0 TDCi diesel", 2005, 2010, "G6DA", "Diesel", "Manual", "Front", "Hatchback", "100 kW (136 hp)", "GE1"),
            new Modification("VF-el16", "MD-elantra", "1.6 petrol", 2008, 2011, "G4EE", "Petrol", "Automatic", "Front", "Sedan", "92 kW (125 hp)", "HD"),
            new Modification("VF-ceed16", "MD-ceed", "1.6 petrol", 2013, 2016, "G4", "Petrol", "Manual", "Front", "Hatchback", "85 kW (116 hp)", "P2"),
            new Modification("VF-vesta16", "MD-vesta", "1.6 petrol", 2014, 2017, "VAZ-21129", "Petrol", "Manual", "Front", "Sedan", "90 kW (122 hp)", "VAZ-2112"),
            new Modification("VF-logan16", "MD-logan", "1.6 petrol", 2007, 2012, "K4M", "Petrol", "Manual", "Front", "Sedan", "62 kW (84 hp)", "L38"),
            new Modification("VF-oct20", "MD-octavia", "2.0 TDI diesel", 2013, 2016, "CJZA", "Diesel", "Automatic", "Front", "Liftback", "110 kW (150 hp)", "5E"),
            new Modification("VF-a420", "MD-a4", "2.0 TFSI petrol", 2009, 2012, "EA888", "Petrol", "Automatic", "Front", "Sedan", "132 kW (180 hp)", "B8"),
            new Modification("VF-qash16", "MD-qashqai", "1.6 petrol", 2008, 2011, "HR16", "Petrol", "Manual", "Front", "Crossover", "84 kW (114 hp)", "J10"));
}
