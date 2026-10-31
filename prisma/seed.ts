import { createHash } from "node:crypto";
import type { CertificationStatus, SupplierType } from "../src/generated/prisma/client";

const categories = [
  { slug: "meat", nameRu: "Мясо и птица", nameEn: "Meat and poultry", sortOrder: 1 },
  { slug: "fish", nameRu: "Рыба и морепродукты", nameEn: "Fish and seafood", sortOrder: 2 },
  { slug: "produce", nameRu: "Овощи и фрукты", nameEn: "Produce", sortOrder: 3 },
  { slug: "dairy", nameRu: "Молочная продукция", nameEn: "Dairy", sortOrder: 4 },
  { slug: "grocery", nameRu: "Бакалея и крупы", nameEn: "Grocery", sortOrder: 5 },
  { slug: "frozen", nameRu: "Замороженные продукты", nameEn: "Frozen food", sortOrder: 6 },
  { slug: "drinks", nameRu: "Напитки", nameEn: "Drinks", sortOrder: 7 },
  { slug: "packaging", nameRu: "Упаковка и расходные материалы", nameEn: "Packaging", sortOrder: 8 },
] as const;

type ProductSeed = {
  category: (typeof categories)[number]["slug"];
  name: string;
  price: number | null;
  moq: number | null;
  unit: string;
  delivery: string | null;
};

type SupplierSeed = {
  slug: string;
  name: string;
  type: SupplierType;
  city: string;
  region: string;
  products: ProductSeed[];
  certs: { name: string; status: CertificationStatus }[];
};

const delivery = {
  city: "Демо: отгрузка по городу, 1–2 дня. Срок не подтверждён.",
  region: "Демо: доставка по региону, от 2 дней. Срок не подтверждён.",
  pickup: "Демо: самовывоз со склада. Условия не подтверждены.",
  federal: "Демо: отправка по нескольким регионам, от 3 дней. Покрытие не подтверждено.",
} as const;

const suppliers: SupplierSeed[] = [
  {
    slug: "privolzhskaya-ptica",
    name: "ДЕМО — Приволжская птица",
    type: "FARM",
    city: "Казань",
    region: "Республика Татарстан",
    products: [
      { category: "meat", name: "Тушка цыплёнка-бройлера", price: 246, moq: 100, unit: "кг", delivery: delivery.region },
      { category: "meat", name: "Филе грудки", price: 390, moq: 50, unit: "кг", delivery: delivery.region },
    ],
    certs: [{ name: "Демо: ХАССП", status: "UNVERIFIED" }],
  },
  {
    slug: "stolichny-myasnoy-dvor",
    name: "ДЕМО — Столичный мясной двор",
    type: "WHOLESALER",
    city: "Москва",
    region: "Московская область",
    products: [
      { category: "meat", name: "Говядина лопатка", price: 690, moq: 80, unit: "кг", delivery: delivery.city },
      { category: "meat", name: "Свинина окорок", price: 420, moq: 80, unit: "кг", delivery: delivery.city },
    ],
    certs: [{ name: "Демо: декларация о соответствии", status: "UNVERIFIED" }],
  },
  {
    slug: "donskaya-govyadina",
    name: "ДЕМО — Донская говядина",
    type: "MANUFACTURER",
    city: "Ростов-на-Дону",
    region: "Ростовская область",
    products: [
      { category: "meat", name: "Говядина охлаждённая", price: 640, moq: 150, unit: "кг", delivery: delivery.federal },
      { category: "frozen", name: "Фарш говяжий замороженный", price: 410, moq: 200, unit: "кг", delivery: delivery.federal },
    ],
    certs: [],
  },
  {
    slug: "uralskiy-myasokombinat",
    name: "ДЕМО — Уральский мясокомбинат",
    type: "MANUFACTURER",
    city: "Екатеринбург",
    region: "Свердловская область",
    products: [
      { category: "meat", name: "Колбаса варёная", price: 360, moq: 40, unit: "кг", delivery: delivery.region },
      { category: "meat", name: "Сосиски молочные", price: 310, moq: 30, unit: "кг", delivery: delivery.region },
    ],
    certs: [{ name: "Демо: ХАССП", status: "EXPIRED" }],
  },
  {
    slug: "baltiyskiy-ulov",
    name: "ДЕМО — Балтийский улов",
    type: "IMPORTER",
    city: "Санкт-Петербург",
    region: "Ленинградская область",
    products: [
      { category: "fish", name: "Лосось слабосолёный", price: 1480, moq: 20, unit: "кг", delivery: delivery.federal },
      { category: "fish", name: "Креветка 16/20", price: 980, moq: 10, unit: "кг", delivery: delivery.federal },
    ],
    certs: [{ name: "Демо: ветеринарное свидетельство", status: "UNVERIFIED" }],
  },
  {
    slug: "chernomorskaya-ryba",
    name: "ДЕМО — Черноморская рыба",
    type: "DISTRIBUTOR",
    city: "Краснодар",
    region: "Краснодарский край",
    products: [
      { category: "fish", name: "Форель потрошёная", price: 890, moq: 25, unit: "кг", delivery: delivery.region },
      { category: "fish", name: "Минтай филе", price: 320, moq: 40, unit: "кг", delivery: delivery.region },
    ],
    certs: [],
  },
  {
    slug: "obskaya-ryba",
    name: "ДЕМО — Обская рыба",
    type: "WHOLESALER",
    city: "Новосибирск",
    region: "Новосибирская область",
    products: [
      { category: "fish", name: "Минтай тушка", price: 210, moq: 100, unit: "кг", delivery: delivery.region },
      { category: "frozen", name: "Рыбные котлеты", price: 280, moq: 50, unit: "кг", delivery: delivery.pickup },
    ],
    certs: [{ name: "Демо: ХАССП", status: "UNVERIFIED" }],
  },
  {
    slug: "kubanskie-ovoshchi",
    name: "ДЕМО — Кубанские овощи",
    type: "FARM",
    city: "Краснодар",
    region: "Краснодарский край",
    products: [
      { category: "produce", name: "Томаты розовые", price: 165, moq: 200, unit: "кг", delivery: delivery.federal },
      { category: "produce", name: "Огурцы гладкие", price: 140, moq: 200, unit: "кг", delivery: delivery.federal },
    ],
    certs: [{ name: "Демо: декларация о соответствии", status: "UNVERIFIED" }],
  },
  {
    slug: "moskovskaya-teplitsa",
    name: "ДЕМО — Московская теплица",
    type: "FARM",
    city: "Москва",
    region: "Московская область",
    products: [
      { category: "produce", name: "Салат айсберг", price: 190, moq: 40, unit: "кг", delivery: delivery.city },
      { category: "produce", name: "Зелень ассорти", price: 420, moq: 10, unit: "кг", delivery: delivery.city },
    ],
    certs: [],
  },
  {
    slug: "volzhskiy-sad",
    name: "ДЕМО — Волжский сад",
    type: "DISTRIBUTOR",
    city: "Нижний Новгород",
    region: "Нижегородская область",
    products: [
      { category: "produce", name: "Яблоки сезонные", price: 95, moq: 300, unit: "кг", delivery: delivery.region },
      { category: "produce", name: "Картофель мытый", price: 42, moq: 500, unit: "кг", delivery: delivery.region },
    ],
    certs: [{ name: "Демо: декларация о соответствии", status: "UNVERIFIED" }],
  },
  {
    slug: "tatarstanskie-yagody",
    name: "ДЕМО — Татарстанские ягоды",
    type: "FARM",
    city: "Казань",
    region: "Республика Татарстан",
    products: [
      { category: "produce", name: "Клубника", price: 480, moq: 20, unit: "кг", delivery: null },
      { category: "frozen", name: "Клубника замороженная", price: 310, moq: 30, unit: "кг", delivery: delivery.pickup },
    ],
    certs: [],
  },
  {
    slug: "nevskaya-molochnaya",
    name: "ДЕМО — Невская молочная",
    type: "MANUFACTURER",
    city: "Санкт-Петербург",
    region: "Ленинградская область",
    products: [
      { category: "dairy", name: "Молоко 3,2%", price: 78, moq: 100, unit: "л", delivery: delivery.region },
      { category: "dairy", name: "Сметана 20%", price: 210, moq: 40, unit: "кг", delivery: delivery.region },
    ],
    certs: [{ name: "Демо: ХАССП", status: "UNVERIFIED" }],
  },
  {
    slug: "sibirskoe-moloko",
    name: "ДЕМО — Сибирское молоко",
    type: "MANUFACTURER",
    city: "Новосибирск",
    region: "Новосибирская область",
    products: [
      { category: "dairy", name: "Творог 5%", price: 260, moq: 30, unit: "кг", delivery: delivery.region },
      { category: "dairy", name: "Сыр полутвёрдый", price: 620, moq: 15, unit: "кг", delivery: delivery.region },
    ],
    certs: [{ name: "Демо: декларация о соответствии", status: "EXPIRED" }],
  },
  {
    slug: "kazanskiy-molochnyy-ceh",
    name: "ДЕМО — Казанский молочный цех",
    type: "MANUFACTURER",
    city: "Казань",
    region: "Республика Татарстан",
    products: [
      { category: "dairy", name: "Кефир 1%", price: 72, moq: 80, unit: "л", delivery: delivery.city },
      { category: "dairy", name: "Масло сливочное 82,5%", price: 780, moq: 10, unit: "кг", delivery: delivery.city },
    ],
    certs: [],
  },
  {
    slug: "centralnaya-bakaleya",
    name: "ДЕМО — Центральная бакалея",
    type: "WHOLESALER",
    city: "Москва",
    region: "Московская область",
    products: [
      { category: "grocery", name: "Рис круглозёрный", price: 92, moq: 200, unit: "кг", delivery: delivery.federal },
      { category: "grocery", name: "Мука пшеничная высший сорт", price: 48, moq: 400, unit: "кг", delivery: delivery.federal },
      { category: "grocery", name: "Масло подсолнечное", price: 130, moq: 100, unit: "л", delivery: delivery.federal },
    ],
    certs: [{ name: "Демо: декларация о соответствии", status: "UNVERIFIED" }],
  },
  {
    slug: "severnaya-zamorozka",
    name: "ДЕМО — Северная заморозка",
    type: "DISTRIBUTOR",
    city: "Санкт-Петербург",
    region: "Ленинградская область",
    products: [
      { category: "frozen", name: "Овощная смесь", price: 145, moq: 80, unit: "кг", delivery: delivery.federal },
      { category: "frozen", name: "Картофель фри", price: 160, moq: 60, unit: "кг", delivery: delivery.federal },
    ],
    certs: [{ name: "Демо: ХАССП", status: "UNVERIFIED" }],
  },
  {
    slug: "stolichnye-napitki",
    name: "ДЕМО — Столичные напитки",
    type: "IMPORTER",
    city: "Москва",
    region: "Московская область",
    products: [
      { category: "drinks", name: "Вода негазированная 19 л", price: 280, moq: 20, unit: "шт", delivery: delivery.city },
      { category: "drinks", name: "Сок яблочный 1 л", price: 95, moq: 48, unit: "шт", delivery: delivery.city },
    ],
    certs: [{ name: "Демо: декларация о соответствии", status: "UNVERIFIED" }],
  },
  {
    slug: "upakovka-povolzhyya",
    name: "ДЕМО — Упаковка Поволжья",
    type: "PACKAGING",
    city: "Казань",
    region: "Республика Татарстан",
    products: [
      { category: "packaging", name: "Контейнер ПЭТ 500 мл", price: 6.5, moq: 1000, unit: "шт", delivery: delivery.federal },
      { category: "packaging", name: "Пакет бумажный", price: 9, moq: 500, unit: "шт", delivery: delivery.federal },
    ],
    certs: [{ name: "Демо: декларация о соответствии", status: "UNVERIFIED" }],
  },
];

function idFor(key: string) {
  const hex = createHash("sha256").update(key).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export { categories, suppliers, idFor };
