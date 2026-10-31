import "dotenv/config";
import { createHash } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  type CertificationStatus,
  type SupplierType,
} from "../src/generated/prisma/client";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

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
    slug: "uralskie-krupy",
    name: "ДЕМО — Уральские крупы",
    type: "DISTRIBUTOR",
    city: "Екатеринбург",
    region: "Свердловская область",
    products: [
      { category: "grocery", name: "Гречка ядрица", price: 86, moq: 150, unit: "кг", delivery: delivery.region },
      { category: "grocery", name: "Овсяные хлопья", price: 74, moq: 100, unit: "кг", delivery: delivery.region },
    ],
    certs: [],
  },
  {
    slug: "yuzhnaya-bakaleya",
    name: "ДЕМО — Южная бакалея",
    type: "WHOLESALER",
    city: "Ростов-на-Дону",
    region: "Ростовская область",
    products: [
      { category: "grocery", name: "Сахар песок", price: 62, moq: 500, unit: "кг", delivery: delivery.federal },
      { category: "grocery", name: "Соль пищевая", price: 18, moq: 200, unit: "кг", delivery: delivery.federal },
    ],
    certs: [{ name: "Демо: декларация о соответствии", status: "UNVERIFIED" }],
  },
  {
    slug: "nizhegorodskiy-sklad-krup",
    name: "ДЕМО — Нижегородский склад круп",
    type: "DISTRIBUTOR",
    city: "Нижний Новгород",
    region: "Нижегородская область",
    products: [
      { category: "grocery", name: "Макароны группа А", price: 70, moq: 120, unit: "кг", delivery: delivery.region },
      { category: "grocery", name: "Рис пропаренный", price: 110, moq: null, unit: "кг", delivery: delivery.region },
    ],
    certs: [],
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
    slug: "holod-urala",
    name: "ДЕМО — Холод Урала",
    type: "WHOLESALER",
    city: "Екатеринбург",
    region: "Свердловская область",
    products: [
      { category: "frozen", name: "Пельмени говяжьи", price: 340, moq: 40, unit: "кг", delivery: delivery.region },
      { category: "frozen", name: "Ягоды смесь", price: 290, moq: 20, unit: "кг", delivery: delivery.region },
    ],
    certs: [],
  },
  {
    slug: "donskoy-holod",
    name: "ДЕМО — Донской холод",
    type: "DISTRIBUTOR",
    city: "Ростов-на-Дону",
    region: "Ростовская область",
    products: [
      { category: "frozen", name: "Курица замороженная", price: 210, moq: 200, unit: "кг", delivery: delivery.federal },
      { category: "meat", name: "Куриное филе замороженное", price: 330, moq: 100, unit: "кг", delivery: delivery.federal },
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
    slug: "kubanskie-soki",
    name: "ДЕМО — Кубанские соки",
    type: "MANUFACTURER",
    city: "Краснодар",
    region: "Краснодарский край",
    products: [
      { category: "drinks", name: "Нектар персиковый", price: 88, moq: 60, unit: "л", delivery: delivery.federal },
      { category: "drinks", name: "Морс клюквенный", price: 120, moq: 40, unit: "л", delivery: delivery.federal },
    ],
    certs: [],
  },
  {
    slug: "volzhskaya-voda",
    name: "ДЕМО — Волжская вода",
    type: "MANUFACTURER",
    city: "Нижний Новгород",
    region: "Нижегородская область",
    products: [
      { category: "drinks", name: "Вода газированная 1,5 л", price: 32, moq: 100, unit: "шт", delivery: delivery.region },
      { category: "drinks", name: "Лимонад", price: 54, moq: 80, unit: "л", delivery: delivery.region },
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
  {
    slug: "moskovskaya-tara",
    name: "ДЕМО — Московская тара",
    type: "PACKAGING",
    city: "Москва",
    region: "Московская область",
    products: [
      { category: "packaging", name: "Плёнка пищевая", price: 240, moq: 20, unit: "шт", delivery: delivery.city },
      { category: "packaging", name: "Перчатки нитриловые", price: 180, moq: 10, unit: "упак", delivery: delivery.city },
    ],
    certs: [],
  },
  {
    slug: "sibirskaya-upakovka",
    name: "ДЕМО — Сибирская упаковка",
    type: "PACKAGING",
    city: "Новосибирск",
    region: "Новосибирская область",
    products: [
      { category: "packaging", name: "Короб гофрокартон", price: null, moq: 100, unit: "шт", delivery: delivery.pickup },
      { category: "packaging", name: "Скотч упаковочный", price: 95, moq: 36, unit: "шт", delivery: delivery.pickup },
    ],
    certs: [],
  },
];

function idFor(key: string) {
  const hex = createHash("sha256").update(key).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

async function main() {
  await prisma.supplier.deleteMany({ where: { dataType: "DEMO" } });
  await prisma.category.deleteMany();

  const description =
    "Демонстрационная карточка. Название, цены, минимальный заказ, контакты и сертификаты вымышлены и не являются коммерческим предложением или проверенным источником.";

  for (const category of categories) {
    await prisma.category.create({
      data: {
        id: idFor(`category:${category.slug}`),
        ...category,
      },
    });
  }

  for (const [index, supplier] of suppliers.entries()) {
    const supplierId = idFor(`supplier:${supplier.slug}`);
    const createdAt = new Date(Date.UTC(2026, 8, 1) + index * 36 * 60 * 60 * 1000);

    await prisma.supplier.create({
      data: {
        id: supplierId,
        slug: supplier.slug,
        name: supplier.name,
        description,
        supplierType: supplier.type,
        city: supplier.city,
        region: supplier.region,
        country: "Россия",
        address: `Демонстрационный адрес, ${supplier.city}`,
        website: `https://example.com/demo/${supplier.slug}`,
        sourceUrl: `https://example.com/demo/${supplier.slug}`,
        dataType: "DEMO",
        verificationStatus: "UNVERIFIED",
        isActive: true,
        createdAt,
        products: {
          create: supplier.products.map((product) => ({
            id: idFor(`product:${supplier.slug}:${product.name}`),
            categoryId: idFor(`category:${product.category}`),
            name: product.name,
            estimatedPrice: product.price,
            currency: "RUB",
            minimumOrderQuantity: product.moq,
            unit: product.unit,
            deliveryNotes: product.delivery,
            isAvailable: true,
            dataType: "DEMO",
            priceUpdatedAt: product.price == null ? null : createdAt,
          })),
        },
        contacts: {
          create: [
            {
              id: idFor(`contact:${supplier.slug}:phone`),
              type: "PHONE",
              label: "Демо-телефон",
              value: `+7 (000) 100-${String(index + 1).padStart(2, "0")}-01`,
              isPublic: true,
            },
            {
              id: idFor(`contact:${supplier.slug}:email`),
              type: "EMAIL",
              label: "Демо-почта",
              value: `demo+${supplier.slug}@example.com`,
              isPublic: true,
            },
            {
              id: idFor(`contact:${supplier.slug}:web`),
              type: "WEBSITE",
              label: "Демо-сайт",
              value: `https://example.com/demo/${supplier.slug}`,
              isPublic: true,
            },
          ],
        },
        certifications: {
          create: supplier.certs.map((cert) => ({
            id: idFor(`cert:${supplier.slug}:${cert.name}`),
            name: cert.name,
            status: cert.status,
            issuer: "Демонстрационный орган",
            verificationNotes:
              "Запись вымышлена. Документ не проверялся и не подтверждает соответствие.",
          })),
        },
        sources: {
          create: [
            {
              id: idFor(`source:${supplier.slug}`),
              sourceType: "DEMO",
              url: `https://example.com/demo/${supplier.slug}`,
              title: "Демонстрационная карточка",
              evidence:
                "Fabricated sample. This URL is a placeholder, not a citation of a real company.",
              isPrimary: true,
              checkedAt: createdAt,
            },
          ],
        },
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
