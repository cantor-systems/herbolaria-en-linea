import {
  Brand,
  Vendor,
  Category,
  Product,
  Customer,
  Order,
  Seller,
  OrderCommission,
  Review,
  AppNotification
} from '../types/ecommerce';

export const MOCK_BRANDS: Brand[] = [
  {
    id: "brand-herbazen",
    name: "Herbazen",
    description: "Marca especializada en extractos y suplementos herbolarios de alta calidad elaborados bajo estrictos procesos artesanales.",
    website: "https://herbazen.com"
  }
];

export const MOCK_VENDORS: Vendor[] = [
  {
    id: "vendor-herbazen-mx",
    name: "Laboratorios Herbazen México",
    code: "HERB-MX-01",
    contactEmail: "proveedores@herbazen.com",
    status: "active"
  }
];

export const MOCK_CATEGORIES: Category[] = [
  {
    id: "cat-herbolaria-planta",
    name: "Herbolaria en Planta y Tés",
    slug: "herbolaria-en-planta",
    description: "Hierbas deshidratadas en hoja y tallo seleccionadas artesanalmente para infusiones tradicionales.",
    image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&q=80&w=800",
    productCount: 2
  },
  {
    id: "cat-gotas-extractos",
    name: "Gotas y Extractos Concentrados",
    slug: "gotas-y-extractos",
    description: "Tinturas madre de extracción hidroalcohólica pura para rápida asimilación.",
    image: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&q=80&w=800",
    productCount: 2
  },
  {
    id: "cat-capsulas",
    name: "Cápsulas y Suplementos",
    slug: "capsulas-y-suplementos",
    description: "Cápsulas vegetales de 500mg ideales para el consumo diario sin aditivos.",
    image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=800",
    productCount: 2
  },
  {
    id: "cat-paquetes-kits",
    name: "Paquetes y Kits (Bundles)",
    slug: "paquetes-y-kits",
    description: "Combinaciones completas de distintas presentaciones con descuento directo especial.",
    image: "https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?auto=format&fit=crop&q=80&w=800",
    productCount: 2
  }
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "prod-moronel-hierba",
    name: "Moronel Hierba Orgánica Deshidratada (240g)",
    slug: "moronel-hierba-240g",
    brandId: "brand-herbazen",
    brandName: "Herbazen",
    vendorId: "vendor-herbazen-mx",
    categoryId: "cat-herbolaria-planta",
    categoryName: "Herbolaria en Planta y Tés",
    shortDescription: "Planta de Moronel seleccionada en hojas y tallo para infusión o té tradicional. 100% natural sin conservadores.",
    description: "Nuestra presentación de Moronel en hierba conserva la esencia original y botanical de la planta. Recolectada artesanalmente en su punto óptimo de madurez y deshidratada a baja temperatura para preservar sus propiedades naturales característicos de la tradición herbolaria mexicana.",
    content: "Bolsa resellable hermética con 240 g de planta seca de Moronel (Hojas y tallos finamente troceados).",
    usageInstructions: "Hervir 1 litro de agua, agregar 1 a 2 cucharadas soperas de Moronel en hierba, dejar reposar a fuego lento durante 5 a 10 minutos. Colar y consumir como agua de uso o té preferentemente tibio.",
    ingredients: "100% Moronel (Calycophyllum candidissimum) deshidratado de origen silvestre.",
    importantNotice: "Este producto es un auxiliar tradicional herbolario. No es un medicamento. Conserve el empaque cerrado en un lugar fresco y seco alejado de la luz solar directa.",
    images: [
      "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=800"
    ],
    isFeatured: true,
    isBundle: false,
    rating: 4.9,
    reviewCount: 128,
    tags: ["Moronel", "Té", "Hierba Natural", "Infusión", "Herbazen"],
    createdAt: "2026-01-15",
    variants: [
      {
        id: "var-moronel-hierba-1",
        productId: "prod-moronel-hierba",
        name: "1 Bolsa (240 Gramos)",
        sku: "MOR-HIE-240G-1",
        price: 249,
        compareAtPrice: 280,
        pricePerUnit: "$249.00 / paquete",
        stock: 85,
        unitCount: 1
      },
      {
        id: "var-moronel-hierba-3",
        productId: "prod-moronel-hierba",
        name: "3 Bolsas (720 Gramos Total)",
        sku: "MOR-HIE-240G-3",
        price: 649,
        compareAtPrice: 747,
        pricePerUnit: "$216.33 / unidad (Ahorras $98)",
        stock: 40,
        unitCount: 3
      },
      {
        id: "var-moronel-hierba-5",
        productId: "prod-moronel-hierba",
        name: "5 Bolsas (1,200 Gramos Total)",
        sku: "MOR-HIE-240G-5",
        price: 999,
        compareAtPrice: 1245,
        pricePerUnit: "$199.80 / unidad (Ahorras $246)",
        stock: 25,
        unitCount: 5
      }
    ]
  },
  {
    id: "prod-moronel-gotas",
    name: "Moronel Gotas Extracto Concentrado 50ml",
    slug: "moronel-gotas",
    brandId: "brand-herbazen",
    brandName: "Herbazen",
    vendorId: "vendor-herbazen-mx",
    categoryId: "cat-gotas-extractos",
    categoryName: "Gotas y Extractos Concentrados",
    shortDescription: "Tintura madre hidroalcohólica de Moronel. Cómoda presentación líquida con gotero dosificador para asimilación práctica.",
    description: "El extracto líquido en gotas de Moronel Herbazen ofrece una máxima concentración botanical en un frasco portátil. Elaborado mediante maceración prolongada en vehículo purificado, facilitando su transporte y consumo en cualquier momento del día sin necesidad de hervir agua.",
    content: "Frasco de vidrio ámbar de 50 ml con gotero graduado de alta precisión.",
    usageInstructions: "Disolver 20 a 30 gotas en medio vaso de agua tibia o al gusto, consumiéndose 2 a 3 veces al día antes o después de los alimentos.",
    ingredients: "Extracto concentrado de Moronel (Calycophyllum candidissimum), agua purificada y vehículo hidroalcohólico grado alimenticio al 30%.",
    importantNotice: "Auxiliar herbolario de uso tradicional. No sustituye un tratamiento médico prescrito. Evitar su consumo en estado de embarazo o lactancia.",
    images: [
      "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&q=80&w=800"
    ],
    isFeatured: true,
    isBundle: false,
    rating: 4.8,
    reviewCount: 96,
    tags: ["Gotas", "Extracto", "Tintura Madre", "Moronel", "Herbazen"],
    createdAt: "2026-01-20",
    variants: [
      {
        id: "var-moronel-gotas-1",
        productId: "prod-moronel-gotas",
        name: "1 frasco (50ml)",
        sku: "MOR-GOT-50ML-1",
        price: 320,
        compareAtPrice: 360,
        pricePerUnit: "$320.00 / frasco",
        stock: 120,
        unitCount: 1
      },
      {
        id: "var-moronel-gotas-3",
        productId: "prod-moronel-gotas",
        name: "Paquete 3 frascos (150ml)",
        sku: "MOR-GOT-50ML-3",
        price: 850,
        compareAtPrice: 960,
        pricePerUnit: "$283.33 / frasco (Ahorras $110)",
        stock: 60,
        unitCount: 3
      },
      {
        id: "var-moronel-gotas-5",
        productId: "prod-moronel-gotas",
        name: "Paquete 5 frascos (250ml)",
        sku: "MOR-GOT-50ML-5",
        price: 1299,
        compareAtPrice: 1600,
        pricePerUnit: "$259.80 / frasco (Ahorras $301)",
        stock: 30,
        unitCount: 5
      }
    ]
  },
  {
    id: "prod-moronel-capsulas",
    name: "Moronel en Cápsulas Vegetales (60 Cápsulas)",
    slug: "moronel-capsulas-60-capsulas",
    brandId: "brand-herbazen",
    brandName: "Herbazen",
    vendorId: "vendor-herbazen-mx",
    categoryId: "cat-capsulas",
    categoryName: "Cápsulas y Suplementos",
    shortDescription: "Cápsulas de microencapsulado de Moronel. Prácticas, fáciles de tomar y sin sabor amargo.",
    description: "Las cápsulas de Moronel Herbazen proporcionan la dosis óptima de planta pulverizada de forma limpia y práctica. Elaboradas con cápsula 100% vegetal (HPMC), libre de estearatos sintéticos y sin sabor amargo.",
    content: "Frasco con 60 cápsulas vegetales de 500 mg cada una.",
    usageInstructions: "Tomar 2 cápsulas al día (una por la mañana y una por la tarde) acompañadas con suficiente agua.",
    ingredients: "Moronel micropulverizado puro (500mg por cápsula), cápsula de celulosa vegetal.",
    importantNotice: "Consérvese bien cerrado en un lugar fresco. Manténgase fuera del alcance de los niños. Suplemento herbolario tradicional.",
    images: [
      "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1550572017-edf703cf0590?auto=format&fit=crop&q=80&w=800"
    ],
    isFeatured: true,
    isBundle: false,
    rating: 4.9,
    reviewCount: 215,
    tags: ["Cápsulas", "Suplemento", "Moronel", "Herbazen"],
    createdAt: "2026-02-01",
    variants: [
      {
        id: "var-moronel-capsulas-1",
        productId: "prod-moronel-capsulas",
        name: "1 Frasco (60 Cápsulas)",
        sku: "MOR-CAP-60-1",
        price: 380,
        compareAtPrice: 420,
        pricePerUnit: "$380.00 / frasco",
        stock: 95,
        unitCount: 1
      },
      {
        id: "var-moronel-capsulas-3",
        productId: "prod-moronel-capsulas",
        name: "3 Frascos (180 Cápsulas Total)",
        sku: "MOR-CAP-60-3",
        price: 990,
        compareAtPrice: 1140,
        pricePerUnit: "$330.00 / frasco (Ahorras $150)",
        stock: 50,
        unitCount: 3
      },
      {
        id: "var-moronel-capsulas-5",
        productId: "prod-moronel-capsulas",
        name: "5 Frascos (300 Cápsulas Total)",
        sku: "MOR-CAP-60-5",
        price: 1490,
        compareAtPrice: 1900,
        pricePerUnit: "$298.00 / frasco (Ahorras $410)",
        stock: 35,
        unitCount: 5
      }
    ]
  },
  {
    id: "prod-moronel-paquete-integral",
    name: "Paquete Integral Moronel (Trío de Presentaciones)",
    slug: "paquete-integral-moronel",
    brandId: "brand-herbazen",
    brandName: "Herbazen",
    vendorId: "vendor-herbazen-mx",
    categoryId: "cat-paquetes-kits",
    categoryName: "Paquetes y Kits (Bundles)",
    shortDescription: "Kit completo que combina las 3 presentaciones de Moronel: Hierba 240g + Gotas 50ml + Cápsulas 60 caps con precio de paquete especial.",
    description: "Experimenta la versatilidad de la planta de Moronel con nuestro Kit Integral Herbazen. Incluye una bolsa de Hierba para infusión nocturna o matutina, un frasco de Gotas para llevar en tu bolso o trabajo, y un frasco de Cápsulas para tu rutina diaria.",
    content: "1 Bolsa Moronel Hierba (240g) + 1 Frasco Moronel Gotas (50ml) + 1 Frasco Moronel Cápsulas (60 caps). Envío Gratis Incluido.",
    usageInstructions: "Consumir las cápsulas en la mañana, las gotas a mediodía y el té caliente de hierba por la noche antes de descansar.",
    ingredients: "Moronel (Calycophyllum candidissimum) en sus 3 presentaciones artesanales estandarizadas.",
    importantNotice: "Kit promocional con envío prioritario sin costo adicional.",
    images: [
      "https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&q=80&w=800"
    ],
    isFeatured: true,
    isBundle: true, // Distinct bundle product
    rating: 5.0,
    reviewCount: 310,
    tags: ["Bundle", "Paquete", "Trío Moronel", "Envío Gratis", "Herbazen"],
    createdAt: "2026-02-10",
    variants: [
      {
        id: "var-bundle-trino-1",
        productId: "prod-moronel-paquete-integral",
        name: "1 Paquete Trío Integral",
        sku: "BUN-MOR-TRIO-1",
        price: 890,
        compareAtPrice: 949,
        pricePerUnit: "$890.00 / paquete completo (Ahorras $59 vs individual)",
        stock: 65,
        unitCount: 1
      },
      {
        id: "var-bundle-trino-2",
        productId: "prod-moronel-paquete-integral",
        name: "Doble Paquete Trío (2 Kits Completos)",
        sku: "BUN-MOR-TRIO-2",
        price: 1650,
        compareAtPrice: 1898,
        pricePerUnit: "$825.00 / kit completo (Ahorras $248)",
        stock: 30,
        unitCount: 2
      }
    ]
  },
  {
    id: "prod-te-relax-herbazen",
    name: "Té Relax Herbolario Herbazen (Toronjil, Azahar y Toronja)",
    slug: "te-relax-herbazen",
    brandId: "brand-herbazen",
    brandName: "Herbazen",
    vendorId: "vendor-herbazen-mx",
    categoryId: "cat-herbolaria-planta",
    categoryName: "Herbolaria en Planta y Tés",
    shortDescription: "Mezcla tradicional de toronjil, flor de azahar y hojas de toronja para infusión reconstituyente de tarde.",
    description: "Una sinergia botánica reconfortante desarrollada por Herbazen para brindar momentos de tranquilidad y descanso natural. Elaborada con flores de azahar seleccionadas y hojas fragantes.",
    content: "Caja con 25 sobres biodegradables de infusión herbolaria.",
    usageInstructions: "Infusionar 1 sobre en 250ml de agua caliente por 5 minutos.",
    ingredients: "Toronjil blanco, Flor de azahar, Hojas de toronja, Zacate limón.",
    importantNotice: "Consérvese en un lugar fresco y protegido de la humedad.",
    images: [
      "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=800"
    ],
    isFeatured: false,
    isBundle: false,
    rating: 4.7,
    reviewCount: 42,
    tags: ["Té Relax", "Azahar", "Toronjil", "Infusión", "Herbazen"],
    createdAt: "2026-02-12",
    variants: [
      {
        id: "var-te-relax-1",
        productId: "prod-te-relax-herbazen",
        name: "1 caja (25 sobres)",
        sku: "TE-REL-25-1",
        price: 180,
        compareAtPrice: 200,
        pricePerUnit: "$180.00 / caja",
        stock: 50,
        unitCount: 1
      },
      {
        id: "var-te-relax-3",
        productId: "prod-te-relax-herbazen",
        name: "3 cajas (75 sobres)",
        sku: "TE-REL-25-3",
        price: 480,
        compareAtPrice: 540,
        pricePerUnit: "$160.00 / caja",
        stock: 20,
        unitCount: 3
      }
    ]
  }
];

export const MOCK_SELLERS: Seller[] = [
  {
    id: "seller-01",
    name: "Ana María Gutiérrez",
    code: "ANA-MORONEL",
    email: "ana.gutierrez@vendedores.herbazen.com",
    phone: "55 9876 5432",
    commissionRate: 0.12, // 12%
    totalSales: 48900,
    totalCommissions: 5868,
    status: "active"
  },
  {
    id: "seller-02",
    name: "Carlos Eduardo Mendoza",
    code: "CARLOS-SALUD",
    email: "carlos.mendoza@vendedores.herbazen.com",
    phone: "55 8765 4321",
    commissionRate: 0.10, // 10%
    totalSales: 32400,
    totalCommissions: 3240,
    status: "active"
  }
];

export const MOCK_CUSTOMERS: Customer[] = [
  {
    id: "cust-101",
    name: "María Elena Morales",
    email: "maria.morales@gmail.com",
    phone: "55 1122 3344",
    acceptMarketingWhatsApp: true,
    ordersCount: 3,
    totalSpent: 2670,
    createdAt: "2026-01-18",
    addresses: [
      {
        id: "addr-1",
        fullName: "María Elena Morales",
        street: "Calle Magnolia",
        exteriorNo: "124",
        interiorNo: "Apt 302",
        neighborhood: "Colonia del Valle",
        city: "Benito Juárez",
        state: "Ciudad de México",
        postalCode: "03100",
        country: "México",
        phone: "55 1122 3344",
        isDefault: true
      }
    ]
  },
  {
    id: "cust-102",
    name: "Roberto Fernández",
    email: "roberto.f@hotmail.com",
    phone: "81 9988 7766",
    acceptMarketingWhatsApp: false,
    ordersCount: 1,
    totalSpent: 890,
    createdAt: "2026-02-05",
    addresses: [
      {
        id: "addr-2",
        fullName: "Roberto Fernández",
        street: "Av. Constitución",
        exteriorNo: "880",
        neighborhood: "Centro",
        city: "Monterrey",
        state: "Nuevo León",
        postalCode: "64000",
        country: "México",
        phone: "81 9988 7766",
        isDefault: true
      }
    ]
  }
];

export const MOCK_ORDERS: Order[] = [
  {
    id: "ord-8001",
    orderNumber: "PED-8001",
    customer: {
      id: "cust-101",
      name: "María Elena Morales",
      email: "maria.morales@gmail.com",
      phone: "55 1122 3344"
    },
    shippingAddress: {
      id: "addr-1",
      fullName: "María Elena Morales",
      street: "Calle Magnolia",
      exteriorNo: "124",
      interiorNo: "Apt 302",
      neighborhood: "Colonia del Valle",
      city: "Benito Juárez",
      state: "Ciudad de México",
      postalCode: "03100",
      country: "México",
      phone: "55 1122 3344"
    },
    items: [
      {
        id: "item-1",
        product: MOCK_PRODUCTS[3], // Paquete integral
        variant: MOCK_PRODUCTS[3].variants[0],
        quantity: 1,
        unitPrice: 890
      }
    ],
    subtotal: 890,
    discountAmount: 0,
    shippingFee: 0, // gratis mayor a 899
    total: 890,
    status: "shipped",
    paymentMethod: "mercadopago_card",
    paymentStatus: "paid",
    marketingConsentWhatsApp: true,
    sellerId: "seller-01",
    sellerName: "Ana María Gutiérrez",
    commission: {
      id: "comm-8001",
      orderId: "ord-8001",
      sellerId: "seller-01",
      sellerName: "Ana María Gutiérrez",
      subtotalEligible: 890,
      rate: 0.12,
      amount: 106.8,
      status: "payable",
      createdAt: "2026-02-20"
    },
    shipment: {
      id: "ship-101",
      orderId: "ord-8001",
      trackingNumber: "EST-99482710",
      carrier: "Estafeta",
      status: "in_transit",
      estimatedDeliveryDate: "2026-07-28",
      trackingUrl: "https://www.estafeta.com/Rastreo/EST-99482710"
    },
    createdAt: "2026-02-20 14:30"
  },
  {
    id: "ord-8002",
    orderNumber: "PED-8002",
    customer: {
      id: "cust-102",
      name: "Roberto Fernández",
      email: "roberto.f@hotmail.com",
      phone: "81 9988 7766"
    },
    shippingAddress: {
      id: "addr-2",
      fullName: "Roberto Fernández",
      street: "Av. Constitución",
      exteriorNo: "880",
      neighborhood: "Centro",
      city: "Monterrey",
      state: "Nuevo León",
      postalCode: "64000",
      country: "México",
      phone: "81 9988 7766"
    },
    items: [
      {
        id: "item-2",
        product: MOCK_PRODUCTS[1], // Gotas
        variant: MOCK_PRODUCTS[1].variants[1], // 3 frascos
        quantity: 1,
        unitPrice: 850
      }
    ],
    subtotal: 850,
    discountAmount: 85, // coupon HERBAZEN10
    couponCode: "HERBAZEN10",
    shippingFee: 99,
    total: 864,
    status: "processing",
    paymentMethod: "mercadopago_spei",
    paymentStatus: "paid",
    marketingConsentWhatsApp: false,
    createdAt: "2026-02-22 10:15"
  }
];

export const MOCK_REVIEWS: Review[] = [
  {
    id: "rev-1",
    productId: "prod-moronel-hierba",
    productName: "Moronel Hierba Deshidratada Orgánica",
    authorName: "Martha G.",
    rating: 5,
    title: "Excelente calidad de hierba",
    comment: "Llegó super rápido en paquete bien sellado. Se nota el cuidado y fresco aroma de la planta de Moronel Herbazen. Muy satisfecha con mi compra.",
    verifiedPurchase: true,
    date: "12 Feb 2026"
  },
  {
    id: "rev-2",
    productId: "prod-moronel-gotas",
    productName: "Moronel Gotas Extracto Concentrado 50ml",
    authorName: "Jorge A.",
    rating: 5,
    title: "Muy prácticas las gotas",
    comment: "Las llevo a mi trabajo y las disuelvo fácil en agua. Buen sabor herbal natural y rápida atención de la tienda por WhatsApp.",
    verifiedPurchase: true,
    date: "18 Feb 2026"
  },
  {
    id: "rev-3",
    productId: "prod-moronel-capsulas",
    productName: "Moronel Cápsulas Vegetales 500mg",
    authorName: "Guadalupe S.",
    rating: 5,
    title: "Me gustó la presentación en cápsula",
    comment: "A mi esposo no le gusta el té caliente así que compramos las cápsulas. Vienen bien selladas y los paquetes de 3 frascos salen con muy buen descuento.",
    verifiedPurchase: true,
    date: "20 Feb 2026"
  }
];

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: "notif-1",
    title: "Nuevo Pedido Registrado",
    message: "Pedido PED-8002 recibido por $864 MXN con pago confirmado por SPEI.",
    type: "order",
    date: "Hace 20 min",
    read: false
  },
  {
    id: "notif-2",
    title: "Comisión Pendiente de Aprobar",
    message: "La vendedora Ana María generó $106.80 MXN en comisiones por el pedido PED-8001.",
    type: "commission",
    date: "Hace 2 horas",
    read: false
  }
];

export const MOCK_BLOG_POSTS = [
  {
    id: "post-1",
    title: "Conoce las bondades de la Planta de Moronel en la Herbolaria Tradicional",
    slug: "conoce-las-bondades-del-moronel",
    excerpt: "Descubre el origen, historia y métodos tradicionales de infusión de la planta de Moronel y cómo Herbazen cuida su recolección sustentable.",
    date: "14 de Febrero, 2026",
    author: "Comité Herbolario Herbazen",
    image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&q=80&w=800",
    readTime: "4 min de lectura"
  },
  {
    id: "post-2",
    title: "¿Hierba, Gotas o Cápsulas? Cómo elegir la presentación ideal de Moronel",
    slug: "como-elegir-la-presentacion-ideal-de-moronel",
    excerpt: "Te explicamos las diferencias prácticas entre las 3 presentaciones principales de Moronel y cómo adaptar cada una a tu ritmo de vida.",
    date: "20 de Enero, 2026",
    author: "Dra. Lucía Ramos",
    image: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&q=80&w=800",
    readTime: "5 min de lectura"
  }
];
