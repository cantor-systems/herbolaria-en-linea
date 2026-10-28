export type BlogSection = {
  heading: string;
  paragraphs: string[];
  list?: string[];
  links?: { href: string; label: string }[];
};

export type BlogArticle = {
  slug: string;
  title: string;
  date: string;
  description: string;
  summary: string;
  image: string;
  imageAlt: string;
  category: string;
  sections: BlogSection[];
  comparison?: {
    heading: string;
    columns: string[];
    rows: string[][];
  };
  comparisonAfterSection?: string;
  educationalBlock?: {
    heading: string;
    concepts: { title: string; description: string }[];
  };
  educationalBlockAfterSection?: string;
  notice?: string;
  cta: {
    title: string;
    description: string;
    href: string;
    label: string;
  };
};

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    slug: 'historia-usos-tradicionales-moronel-mexico',
    title: 'Historia y Usos Tradicionales del Moronel (Planta de la Vida) en México',
    date: '12 de Febrero, 2026',
    description: 'Contexto histórico y herbolario tradicional del Moronel, sus formas de preparación y presentaciones actuales.',
    summary: 'Conoce los orígenes herbolarios y las diferentes formas de consumo tradicional de Lonicera subspicata.',
    image: '/images/blog/moronel-usos-tradicionales.webp',
    imageAlt: 'Moronel, Planta de la Vida, en un contexto de herbolaria tradicional',
    category: 'Divulgación Herbolaria Tradicional',
    sections: [
      {
        heading: 'Introducción',
        paragraphs: [
          'El Moronel, conocido popularmente como Planta de la Vida, forma parte de las conversaciones y prácticas de la herbolaria tradicional en distintas regiones de México. Acercarse a esta planta desde su historia permite valorar el conocimiento comunitario y las formas cotidianas de preparación que han acompañado a generaciones.',
          'Este artículo reúne información general y cultural. No busca sustituir la orientación de un profesional de la salud ni presentar los usos tradicionales como evidencia de eficacia médica.',
        ],
      },
      {
        heading: '¿Qué es el Moronel?',
        paragraphs: [
          'Moronel es el nombre con el que se conoce a una planta que, dentro de esta tienda, se identifica como Lonicera subspicata. Su presencia en la conversación herbolaria está vinculada a la apreciación de las plantas y a la transmisión de saberes sobre su manejo y preparación.',
          'Al hablar de una especie vegetal conviene distinguir entre la identidad botánica, el origen de la materia prima y la presentación comercial. Cada uno de estos aspectos ayuda a tomar decisiones informadas sobre un producto.',
        ],
      },
      {
        heading: 'Moronel dentro de la tradición herbolaria',
        paragraphs: [
          'En la tradición herbolaria mexicana, las plantas se han empleado como parte de rutinas familiares, encuentros comunitarios y prácticas de cuidado cultural. Los relatos de uso tradicional describen costumbres y contextos; no equivalen a pruebas clínicas ni a indicaciones terapéuticas.',
          'Reconocer ese contexto también implica respetar la diversidad regional: los nombres comunes, las preparaciones y las recomendaciones transmitidas oralmente pueden variar entre comunidades.',
        ],
        list: [
          'Identificar la planta y su procedencia antes de adquirirla.',
          'Conservar las preparaciones tradicionales como parte del patrimonio cultural, sin convertirlas en promesas de salud.',
          'Consultar a un profesional sanitario ante dudas personales, tratamientos en curso, embarazo o lactancia.',
        ],
      },
      {
        heading: 'Formas tradicionales de preparación',
        paragraphs: [
          'Las hojas deshidratadas suelen prepararse como infusión, siguiendo las indicaciones del empaque. Esta forma de preparación permite integrarse a una rutina pausada y a los hábitos de consumo de bebidas calientes o frías.',
          'En la actualidad también existen presentaciones líquidas y encapsuladas. Su elección responde principalmente a la practicidad, al transporte, al almacenamiento y a las preferencias personales; no implica que una sea médicamente superior a otra.',
        ],
      },
      {
        heading: 'Moronel en la actualidad',
        paragraphs: [
          'La disponibilidad de gotas, cápsulas y hierba deshidratada acerca una tradición vegetal a diferentes estilos de vida. Antes de elegir, resulta útil revisar el formato, la cantidad por envase, las instrucciones de uso y la información de almacenamiento.',
          'Una comunicación responsable evita atribuir a estas presentaciones la capacidad de curar, tratar o prevenir enfermedades. Los productos no sustituyen medicamentos ni atención médica.',
        ],
      },
      {
        heading: 'Importancia del origen y presentación del producto',
        paragraphs: [
          'La información clara sobre la planta, el proceso de selección, el contenido del envase y las condiciones de conservación ayuda a conocer mejor lo que se compra. Mantén los productos cerrados, en un lugar fresco y seco, y sigue siempre las indicaciones de su etiqueta.',
          'Si tienes alguna condición de salud o tomas medicamentos, consulta con un profesional sanitario antes de incorporar cualquier producto herbolario a tu rutina.',
        ],
      },
    ],
    notice: 'Aviso informativo: el contenido se comparte con fines culturales e informativos sobre tradición herbolaria. No es consejo médico, diagnóstico ni tratamiento, y no sustituye la consulta con profesionales de la salud.',
    cta: {
      title: 'Conoce las presentaciones de Moronel',
      description: 'Explora gotas, cápsulas, hierba deshidratada y paquetes para elegir el formato que mejor se adapte a tu rutina.',
      href: '/tienda',
      label: 'Ver productos Moronel',
    },
  },
  {
    slug: 'diferencias-gotas-capsulas-hierba-moronel',
    title: 'Diferencias entre Gotas, Cápsulas y Hierba Deshidratada de Moronel',
    date: '02 de Febrero, 2026',
    description: 'Comparación práctica de las presentaciones de Moronel: gotas, cápsulas y hierba deshidratada.',
    summary: 'Guía práctica para elegir la presentación que mejor se adapte a tu rutina diaria y estilo de vida.',
    image: '/images/products/moronel-gotas-50ml.webp',
    imageAlt: 'Frasco de Moronel en gotas',
    category: 'Guía de Presentaciones',
    sections: [
      {
        heading: 'Introducción',
        paragraphs: [
          'Gotas, cápsulas y hierba deshidratada son formatos distintos para conocer el Moronel. La elección puede basarse en tu rutina, la forma de preparación que prefieras, el espacio de almacenamiento y la cantidad que buscas en cada envase.',
          'Esta comparación describe características de presentación y uso práctico. No establece beneficios médicos ni afirma que un formato sea más efectivo que otro.',
        ],
      },
      {
        heading: 'Moronel en Gotas',
        paragraphs: [
          'Las gotas se presentan en un frasco gotero de 50 ml. Es un formato compacto para quienes prefieren una presentación líquida y desean medir la porción con el gotero incluido, de acuerdo con la etiqueta del producto.',
          'Para conservarlo, mantén el frasco bien cerrado, protegido de la luz directa y en un lugar fresco y seco. Es una alternativa práctica para transportar en un bolso o guardar en un espacio reducido.',
        ],
      },
      {
        heading: 'Moronel en Cápsulas',
        paragraphs: [
          'Las cápsulas se ofrecen en un envase con 60 unidades. Este formato facilita organizar una rutina sin necesidad de preparar una bebida y resulta conveniente para llevar fuera de casa.',
          'Conserva el envase cerrado y seco, y revisa sus instrucciones. Su practicidad se relaciona con el formato individual de cada cápsula, no con una superioridad médica frente a las demás presentaciones.',
        ],
      },
      {
        heading: 'Moronel en Hierba Deshidratada',
        paragraphs: [
          'La hierba deshidratada viene en una bolsa de 240 g y permite realizar una infusión según las indicaciones del empaque. Es la presentación más cercana a la preparación tradicional con planta seca.',
          'Requiere disponer de agua, recipiente y tiempo para preparar y colar la bebida. La bolsa debe mantenerse cerrada en un lugar fresco, seco y alejado de la humedad para cuidar sus características.',
        ],
      },
      {
        heading: '¿Cuál presentación elegir?',
        paragraphs: [
          'Elige gotas si priorizas un frasco pequeño y una presentación líquida; cápsulas si te resulta más cómodo un formato individual; o hierba deshidratada si disfrutas preparar una infusión. Ninguna opción es médicamente superior a otra.',
          'Antes de comprar, revisa la cantidad por envase, los paquetes disponibles y las instrucciones específicas. Ante cualquier duda de salud, busca orientación de un profesional sanitario.',
        ],
      },
      {
        heading: 'Presentaciones y paquetes disponibles',
        paragraphs: [
          'Actualmente, las gotas se ofrecen en frascos de 50 ml, las cápsulas en envases de 60 cápsulas y la hierba en bolsas de 240 g. Cada presentación cuenta con opciones individuales y paquetes de 3, 5 y 10 unidades.',
          'También está disponible un paquete integral que reúne una presentación de cada formato. Consulta la tienda para confirmar disponibilidad y detalles de cada opción.',
        ],
      },
    ],
    comparison: {
      heading: 'Tabla comparativa',
      columns: ['Aspecto', 'Gotas', 'Cápsulas', 'Hierba deshidratada'],
      rows: [
        ['Formato', 'Líquido con gotero', 'Cápsulas vegetales', 'Hojas deshidratadas'],
        ['Presentación', 'Frasco de 50 ml', 'Envase con 60 cápsulas', 'Bolsa de 240 g'],
        ['Practicidad', 'Compacta para medir con gotero', 'Formato individual para llevar', 'Ideal para quien disfruta preparar infusiones'],
        ['Preparación', 'Seguir las indicaciones de la etiqueta', 'Tomar conforme a la etiqueta', 'Requiere preparar y colar una infusión'],
        ['Almacenamiento', 'Frasco cerrado, fresco y sin luz directa', 'Envase cerrado, fresco y seco', 'Bolsa cerrada, fresca y sin humedad'],
        ['Paquetes disponibles', '1, 3, 5 y 10 frascos', '1, 3, 5 y 10 frascos', '1, 3, 5 y 10 bolsas'],
      ],
    },
    cta: {
      title: 'Encuentra el formato para tu rutina',
      description: 'Consulta las presentaciones y paquetes de Moronel disponibles en nuestra tienda.',
      href: '/tienda',
      label: 'Explorar productos Moronel',
    },
  },
  {
    slug: 'moronel-para-que-sirve-usos-tradicionales',
    title: 'Moronel: ¿Para qué se usa tradicionalmente y cuáles son sus presentaciones?',
    date: '24 de Febrero, 2026',
    description: 'Conoce los usos tradicionales del Moronel y las diferencias entre sus presentaciones en hierba deshidratada, gotas y cápsulas.',
    summary: 'Una guía informativa sobre el contexto herbolario tradicional del Moronel y sus formatos actuales.',
    image: '/images/products/moronel-paquete-integral.webp',
    imageAlt: 'Paquete Moronel Integral con gotas, cápsulas y hierba deshidratada',
    category: 'GUÍA HERBOLARIA',
    sections: [
      {
        heading: 'Introducción',
        paragraphs: [
          'El Moronel, también llamado Planta de la Vida, ocupa un lugar en la conversación de la herbolaria tradicional mexicana. Conocer su contexto y las presentaciones disponibles permite acercarse a la planta de forma informada y responsable.',
          'Este artículo comparte información cultural y práctica. Los usos tradicionales descritos no constituyen evidencia de eficacia médica ni sustituyen la valoración de un profesional de la salud.',
        ],
      },
      {
        heading: '¿Qué es el Moronel?',
        paragraphs: [
          'Moronel es el nombre común con el que se identifica una planta que en esta tienda se presenta como Lonicera subspicata. Su interés se relaciona con la historia de las plantas empleadas en prácticas herbolarias y con el conocimiento transmitido entre generaciones.',
          'Al elegir un producto vegetal es útil revisar su origen, la información del envase y las recomendaciones de conservación. Estos elementos ayudan a distinguir la identidad de la planta de las distintas formas en que puede presentarse.',
        ],
      },
      {
        heading: '¿Para qué se ha utilizado tradicionalmente?',
        paragraphs: [
          'En distintos contextos de herbolaria tradicional, el Moronel ha sido mencionado como parte de preparaciones y rutinas culturales. Estas referencias reflejan prácticas históricas y saberes locales, no resultados clínicos comprobados.',
          'Hablar de estos antecedentes con prudencia significa no atribuir al Moronel la capacidad de curar, tratar o prevenir enfermedades. Tampoco debe considerarse un reemplazo de medicamentos, tratamientos médicos o atención profesional.',
        ],
      },
      {
        heading: 'Moronel en hierba deshidratada',
        paragraphs: [
          'La presentación en hierba contiene 240 gramos por bolsa y permite preparar una infusión siguiendo las indicaciones del empaque. Es una opción para quienes disfrutan el proceso tradicional de calentar agua, reposar la planta y colar la bebida.',
          'Para conservarla, guarda la bolsa cerrada en un lugar fresco, seco y alejado de la humedad. Su elección se relaciona con la experiencia de preparación, no con una ventaja médica frente a otros formatos.',
        ],
        links: [{ href: '/categoria/hierbas-e-infusiones', label: 'Ver Moronel en hierba deshidratada' }],
      },
      {
        heading: 'Moronel en gotas',
        paragraphs: [
          'Las gotas se presentan en un frasco de 50 ml con gotero. Su formato líquido es compacto y facilita medir la porción de acuerdo con las indicaciones específicas de la etiqueta.',
          'Mantén el frasco bien cerrado, en un sitio fresco y protegido de la luz directa. Es una alternativa práctica para quienes prefieren una presentación líquida sin una preparación compleja.',
        ],
        links: [{ href: '/categoria/extractos-y-gotas', label: 'Ver Moronel en gotas' }],
      },
      {
        heading: 'Moronel en cápsulas',
        paragraphs: [
          'Las cápsulas se ofrecen en frascos con 60 cápsulas. Este formato evita la preparación de una bebida y puede resultar cómodo para transportar o integrar en una rutina cotidiana.',
          'Guarda el envase cerrado, en un lugar fresco y seco, y consulta siempre sus indicaciones. La practicidad de las cápsulas no significa que sean médicamente superiores a las otras presentaciones.',
        ],
        links: [{ href: '/categoria/capsulas', label: 'Ver Moronel en cápsulas' }],
      },
      {
        heading: '¿Qué presentación elegir?',
        paragraphs: [
          'La elección depende principalmente de tu rutina y preferencias: la hierba invita a una preparación tipo infusión, las gotas ofrecen un formato líquido compacto y las cápsulas aportan portabilidad. Ninguna de estas opciones debe entenderse como más efectiva para fines médicos.',
          'Antes de decidir, revisa la cantidad por envase, la forma de conservación y las indicaciones del producto. Si tienes dudas relacionadas con tu salud o tomas medicamentos, consulta con un profesional sanitario.',
        ],
      },
      {
        heading: 'El Moronel dentro de una rutina de bienestar',
        paragraphs: [
          'Una rutina de bienestar puede incluir hábitos como una alimentación variada, descanso, movimiento y acompañamiento profesional cuando se requiera. Los productos herbolarios pueden conocerse desde su contexto cultural, sin atribuirles funciones terapéuticas.',
          'Prioriza la información clara, respeta las indicaciones de cada envase y evita sustituir la atención médica o un tratamiento indicado por un profesional.',
        ],
      },
      {
        heading: 'Conoce las presentaciones de Moronel',
        paragraphs: [
          'En la tienda encontrarás hierba deshidratada en bolsa de 240 g, gotas en frasco de 50 ml y cápsulas en frasco de 60 unidades. También existen opciones de paquetes para quienes desean conocer distintos formatos.',
        ],
      },
    ],
    comparison: {
      heading: 'Tabla comparativa',
      columns: ['Presentación', 'Formato', 'Preparación', 'Principal ventaja práctica'],
      rows: [
        ['Hierba', 'Planta deshidratada', 'Requiere preparación', 'Experiencia herbolaria tradicional'],
        ['Gotas', 'Extracto líquido', 'No requiere preparación compleja', 'Compacto y fácil de dosificar'],
        ['Cápsulas', 'Cápsulas vegetales', 'No requiere preparación', 'Portabilidad y practicidad'],
      ],
    },
    comparisonAfterSection: '¿Qué presentación elegir?',
    notice: 'Aviso informativo: esta guía comparte información cultural y de presentación de producto. No es consejo médico, diagnóstico ni tratamiento; no previene enfermedades, no sustituye medicamentos y no reemplaza la consulta con profesionales de la salud.',
    cta: {
      title: 'Conoce las presentaciones de Moronel',
      description: 'Explora las opciones disponibles y elige el formato que mejor se adapte a tu rutina.',
      href: '/tienda',
      label: 'Explorar productos Moronel',
    },
  },
  {
    slug: 'como-se-toma-el-moronel',
    title: '¿Cómo se toma el Moronel? Guía de presentaciones y formas de uso',
    date: '28 de Febrero, 2026',
    description: 'Conoce cómo se presentan y utilizan la hierba deshidratada, las gotas y las cápsulas de Moronel.',
    summary: 'Conoce las principales presentaciones de Moronel y las diferencias en su forma de preparación y uso.',
    image: '/images/products/moronel-paquete-integral.webp',
    imageAlt: 'Paquete Moronel Integral con hierba, gotas y cápsulas',
    category: 'GUÍA DE USO',
    sections: [
      {
        heading: 'Introducción',
        paragraphs: [
          'Moronel está disponible en presentaciones pensadas para distintas rutinas: hierba deshidratada, gotas y cápsulas. Conocer las diferencias prácticas de cada formato ayuda a elegir el que mejor se adapte a tus preferencias y forma de organización.',
          'Esta guía describe presentaciones y formas generales de preparación. La cantidad y frecuencia deben seguir las indicaciones vigentes del producto y su etiquetado.',
        ],
      },
      {
        heading: 'Presentaciones disponibles de Moronel',
        paragraphs: [
          'La hierba deshidratada se ofrece en bolsa de 240 gramos; las gotas, en frasco de 50 ml; y las cápsulas, en frasco con 60 cápsulas. No hay actualmente una presentación de Moronel en polvo disponible en la tienda.',
          'Cada formato requiere una forma distinta de uso práctico. Ninguno debe considerarse médicamente superior a otro ni sustituye la orientación de profesionales de la salud.',
        ],
      },
      {
        heading: '¿Cómo se prepara Moronel en hierba?',
        paragraphs: [
          'La hierba deshidratada requiere preparar una infusión conforme a las instrucciones del empaque. Esta presentación permite integrar el proceso tradicional de calentar agua, reposar la planta y colar la bebida.',
          'Mantén la bolsa cerrada, en un lugar fresco y seco. Revisa el etiquetado para conocer la preparación indicada por el producto que adquiriste; no es necesario recurrir a dosis históricas o no verificadas.',
        ],
      },
      {
        heading: '¿Cómo se usa Moronel en gotas?',
        paragraphs: [
          'Las gotas se presentan en un frasco compacto de 50 ml con gotero. Su uso se realiza mediante el gotero incluido, siguiendo la información vigente en la etiqueta.',
          'Conserva el frasco bien cerrado, protegido de la luz directa y en un lugar fresco. La cantidad y frecuencia deben seguir las indicaciones del producto, sin inventar equivalencias ni rutinas personales.',
        ],
      },
      {
        heading: '¿Cómo se toman las cápsulas de Moronel?',
        paragraphs: [
          'Las cápsulas vienen en un frasco con 60 unidades y no requieren preparar una bebida. Este formato puede resultar práctico para transportar o incorporar a una rutina organizada.',
          'Consulta siempre la etiqueta para conocer su modo de uso y conservación. Evita establecer máximos diarios o instrucciones de consumo fuera de las indicaciones vigentes del producto.',
        ],
      },
      {
        heading: '¿Qué presentación elegir?',
        paragraphs: [
          'La hierba deshidratada puede ser adecuada para quien disfruta preparar una infusión; las gotas ofrecen un formato líquido compacto; y las cápsulas eliminan la necesidad de preparar una bebida. La decisión puede basarse en practicidad, almacenamiento y preferencia personal.',
          'Antes de elegir, revisa el contenido del envase, las instrucciones y tus necesidades cotidianas. Ante dudas relacionadas con tu salud o tratamientos en curso, consulta a un profesional sanitario.',
        ],
      },
      {
        heading: 'Recomendaciones importantes',
        paragraphs: [
          'Lee el etiquetado antes de usar cualquier presentación y conserva cada envase de acuerdo con sus indicaciones. No uses este contenido para sustituir una recomendación médica, un medicamento o un tratamiento indicado.',
          'Si estás embarazada, en lactancia, tienes una condición de salud o tomas medicamentos, busca orientación de un profesional sanitario antes de incorporar productos herbolarios a tu rutina.',
        ],
      },
    ],
    comparison: {
      heading: 'Tabla comparativa',
      columns: ['Presentación', 'Preparación', 'Característica principal'],
      rows: [
        ['Hierba', 'Requiere preparación', 'Forma tradicional'],
        ['Gotas', 'Uso mediante gotero', 'Formato compacto'],
        ['Cápsulas', 'No requiere preparación', 'Practicidad'],
      ],
    },
    comparisonAfterSection: '¿Qué presentación elegir?',
    cta: {
      title: 'Conoce las presentaciones de Moronel',
      description: 'Explora las opciones disponibles para encontrar el formato que mejor se adapte a tu rutina.',
      href: '/tienda',
      label: 'Explorar productos Moronel',
    },
  },
  {
    slug: 'moronel-planta-medicinal',
    title: 'Moronel Planta Medicinal',
    date: '05 de Marzo, 2026',
    description: 'Conoce el contexto herbolario tradicional del Moronel, sus presentaciones y cómo interpretar responsablemente las propiedades históricamente atribuidas a la planta.',
    summary: 'Conoce el contexto herbolario tradicional del Moronel, sus presentaciones actuales y cómo interpretar responsablemente las propiedades que históricamente se le han atribuido.',
    image: '/images/blog/moronel-usos-tradicionales.webp',
    imageAlt: 'Moronel en un contexto de herbolaria tradicional',
    category: 'HERBOLARIA TRADICIONAL',
    sections: [
      {
        heading: 'Introducción',
        paragraphs: [
          'El término “planta medicinal” suele utilizarse en la herbolaria tradicional para referirse a especies que han formado parte de prácticas culturales y familiares. En el caso del Moronel, conviene acercarse a este nombre desde el respeto a ese contexto y con información responsable.',
          'Las referencias históricas sobre plantas no equivalen por sí mismas a evidencia clínica. Este artículo no ofrece diagnóstico, tratamiento ni sustitutos para la atención de profesionales de la salud.',
        ],
      },
      {
        heading: 'Moronel dentro de la tradición herbolaria',
        paragraphs: [
          'El Moronel, también conocido como Planta de la Vida, aparece en relatos y prácticas de herbolaria tradicional mexicana. Estos saberes describen formas culturales de conocer y preparar plantas, y pueden variar según la comunidad, la región y la experiencia de cada familia.',
          'Reconocer la tradición implica diferenciar entre usos históricos y eficacia médica comprobada. Los relatos tradicionales no permiten afirmar que una planta cure, trate o prevenga enfermedades.',
        ],
      },
      {
        heading: 'Compuestos vegetales y antioxidantes',
        paragraphs: [
          'Las plantas contienen diversos compuestos naturales que se estudian en campos como la botánica y la ciencia de alimentos. La presencia general de compuestos vegetales o antioxidantes no debe interpretarse como una promesa terapéutica de un producto específico.',
          'Para tomar decisiones informadas, prioriza la identificación de la planta, el origen del producto, la información del envase y las instrucciones de conservación por encima de afirmaciones amplias sobre salud.',
        ],
      },
      {
        heading: 'Moronel y las afirmaciones históricas sobre diabetes',
        paragraphs: [
          'La página comercial histórica y algunas referencias de herbolaria anterior han mencionado al Moronel en conversaciones relacionadas con la diabetes. Es importante entender esas menciones como afirmaciones históricas o usos tradicionales, no como evidencia de que el Moronel trate la diabetes o reduzca la glucosa.',
          'Las personas con diabetes o cualquier otra condición de salud deben seguir el acompañamiento de su equipo sanitario y no sustituir medicamentos, controles ni tratamientos con productos herbolarios.',
        ],
      },
      {
        heading: 'Moronel y las afirmaciones históricas sobre cáncer',
        paragraphs: [
          'El contenido comercial de páginas históricas también ha asociado esta planta con afirmaciones sobre cáncer. Tales afirmaciones deben leerse como parte de una narrativa herbolaria o comercial anterior; no constituyen pruebas de que el Moronel cure o trate cáncer, elimine tumores, prevenga metástasis o reduzca efectos de quimioterapia.',
          'Ante un diagnóstico oncológico, la atención médica especializada es indispensable. Ningún producto de esta tienda reemplaza tratamientos, medicamentos ni las decisiones acordadas con el equipo tratante.',
        ],
      },
      {
        heading: 'El Moronel como producto herbolario',
        paragraphs: [
          'Actualmente el Moronel se ofrece como producto herbolario en tres formatos: hierba deshidratada en bolsa de 240 gramos, gotas en frasco de 50 ml y cápsulas en frasco con 60 cápsulas. Las diferencias entre ellos son principalmente de presentación, preparación y practicidad.',
          'Revisa siempre la etiqueta, el origen y las instrucciones del producto. La elección de una presentación no implica que una sea médicamente superior a otra.',
        ],
      },
      {
        heading: '¿Qué presentación elegir?',
        paragraphs: [
          'La hierba deshidratada permite una preparación tradicional tipo infusión; las gotas ofrecen un formato líquido compacto con gotero; y las cápsulas pueden facilitar el transporte y una rutina sin preparación de bebida.',
          'Elige de acuerdo con tus preferencias de preparación, almacenamiento y uso cotidiano. La cantidad y frecuencia deben seguir las indicaciones vigentes del producto y su etiquetado.',
        ],
      },
      {
        heading: 'Testimonios y experiencias personales',
        paragraphs: [
          'Las experiencias personales pueden ayudar a comprender cómo otras personas describen su rutina o sus preferencias de presentación. Sin embargo, los testimonios no equivalen a evidencia clínica y no permiten predecir resultados para otras personas.',
          'Por esa razón, este artículo no incorpora videos ni promesas basadas en vivencias individuales. Consulta fuentes confiables y profesionales de salud cuando tengas preguntas relacionadas con una condición médica.',
        ],
      },
      {
        heading: 'Uso responsable de productos herbolarios',
        paragraphs: [
          'Usa productos herbolarios con información clara y conforme a su etiquetado. No deben sustituir medicamentos, tratamientos ni la consulta profesional, especialmente si existe una condición de salud, embarazo, lactancia o consumo de otros productos.',
          'Conserva cada presentación en un lugar fresco y seco y busca orientación profesional ante cualquier duda sobre su compatibilidad con tu situación personal.',
        ],
      },
      {
        heading: 'Conoce las presentaciones de Moronel',
        paragraphs: [
          'La tienda reúne las presentaciones actuales de Moronel para que puedas comparar formato y practicidad: hierba deshidratada de 240 g, gotas de 50 ml y cápsulas en frasco con 60 unidades.',
        ],
      },
    ],
    comparison: {
      heading: 'Tabla comparativa',
      columns: ['Presentación', 'Formato', 'Característica principal'],
      rows: [
        ['Hierba', 'Planta deshidratada', 'Preparación tradicional'],
        ['Gotas', 'Extracto líquido', 'Formato compacto con gotero'],
        ['Cápsulas', 'Cápsulas vegetales', 'Uso práctico y portátil'],
      ],
    },
    comparisonAfterSection: '¿Qué presentación elegir?',
    notice: 'Aviso informativo: este contenido ofrece contexto cultural y herbolario tradicional. No es consejo médico, diagnóstico ni tratamiento, no previene enfermedades y no sustituye medicamentos ni la consulta con profesionales de la salud.',
    cta: {
      title: 'Conoce las presentaciones de Moronel',
      description: 'Explora las opciones actuales de Moronel y elige el formato que mejor se adapte a tu rutina.',
      href: '/tienda',
      label: 'Ver productos Moronel',
    },
  },
  {
    slug: 'propiedades-de-la-planta-moronel',
    title: 'Propiedades de la Planta Moronel',
    date: '12 de Marzo, 2026',
    description: 'Conoce los componentes fitoquímicos asociados históricamente al Moronel y aprende a diferenciar composición vegetal, uso tradicional y evidencia clínica.',
    summary: 'Conoce los componentes fitoquímicos mencionados históricamente en el Moronel y cómo interpretar responsablemente las propiedades atribuidas a la planta.',
    image: '/images/blog/moronel-usos-tradicionales.webp',
    imageAlt: 'Moronel y sus hojas en un contexto de herbolaria tradicional',
    category: 'COMPOSICIÓN Y HERBOLARIA',
    sections: [
      {
        heading: 'Introducción',
        paragraphs: [
          'Hablar de las propiedades de una planta puede referirse a su composición, a los usos que históricamente se le han atribuido o a los resultados de investigaciones específicas. Estas categorías no son equivalentes y conviene distinguirlas para interpretar la información con responsabilidad.',
          'Este artículo recupera elementos mencionados en material herbolario histórico sobre el Moronel. No presenta esos elementos como prueba de efectos terapéuticos ni como sustituto de atención médica.',
        ],
      },
      {
        heading: 'Componentes fitoquímicos mencionados',
        paragraphs: [
          'La página histórica mencionaba ácido clorogénico, taninos, fibra soluble o pectina, carotenoides, saponinas, carvacrol, linalool, geraniol y luteolina. Estos nombres forman parte del contenido histórico asociado a la planta.',
          'Mencionar compuestos en una fuente herbolaria no confirma su presencia, concentración o actividad en un producto comercial concreto. Esa diferencia es esencial al hablar de composición vegetal.',
        ],
      },
      {
        heading: 'Ácido clorogénico',
        paragraphs: [
          'El ácido clorogénico aparece entre los compuestos nombrados por el material histórico. Su inclusión en aquella página describe una referencia de composición, no una demostración de beneficios para la salud atribuibles al Moronel.',
          'La investigación de compuestos aislados y la evidencia clínica en personas son niveles distintos de información. No deben transformarse en afirmaciones de tratamiento, prevención o control de enfermedades.',
        ],
      },
      {
        heading: 'Taninos, carotenoides y saponinas',
        paragraphs: [
          'Los taninos, carotenoides y saponinas también fueron mencionados en el contenido anterior, junto con fibra soluble o pectina. Son referencias de composición fitoquímica incluidas en ese material herbolario histórico.',
          'Su mención no permite afirmar que el Moronel reduzca colesterol, controle la presión arterial, produzca pérdida de peso o prevenga enfermedades. Esas interpretaciones requieren evidencia clínica específica que no se presenta aquí.',
        ],
      },
      {
        heading: 'Aceites esenciales y compuestos aromáticos',
        paragraphs: [
          'Carvacrol, linalool y geraniol se enlistaban en la fuente histórica como compuestos aromáticos. El aroma y la composición de una planta pueden variar según la especie, el origen, el procesamiento y el método de análisis.',
          'La página histórica asociaba algunos de estos nombres con funciones como acción antibacteriana o antiinflamatoria. Esas asociaciones pertenecen al contenido anterior y no deben entenderse como eficacia demostrada del producto Moronel.',
        ],
      },
      {
        heading: 'Luteolina',
        paragraphs: [
          'La luteolina fue otro compuesto mencionado en el material histórico. Referir un compuesto por nombre no equivale a establecer una dosis, una concentración, una biodisponibilidad ni un efecto clínico en personas.',
          'Por ello, esta información se presenta como contexto de herbolaria y composición mencionada, no como una recomendación para tratar condiciones de salud.',
        ],
      },
      {
        heading: 'Minerales presentes en la planta',
        paragraphs: [
          'La fuente histórica mencionaba calcio, magnesio, potasio y zinc. Los minerales pueden formar parte de la composición de materiales vegetales, aunque sus cantidades pueden variar y deben determinarse mediante análisis del producto específico.',
          'Estas referencias no permiten atribuir al Moronel la capacidad de corregir deficiencias, controlar enfermedades o reemplazar una alimentación variada y el acompañamiento profesional.',
        ],
      },
      {
        heading: 'Antioxidantes y Moronel',
        paragraphs: [
          'El material anterior relacionaba algunos compuestos mencionados con la palabra “antioxidantes”. En un contexto responsable, esta palabra describe una categoría de investigación y composición, no una promesa de prevención de cáncer, Alzheimer u otras enfermedades.',
          'Los resultados de laboratorio, la composición de una planta y los efectos clínicos en personas son cuestiones diferentes. Este artículo no afirma efectos terapéuticos del Moronel.',
        ],
      },
      {
        heading: 'Presentaciones actuales de Moronel',
        paragraphs: [
          'Actualmente, la tienda ofrece Moronel en hierba deshidratada en bolsa de 240 gramos, gotas en frasco de 50 ml y cápsulas en frasco con 60 cápsulas. Cada presentación responde a necesidades de preparación, almacenamiento y practicidad.',
          'Consulta la información y el etiquetado de cada producto antes de comprar. La presentación elegida no implica una superioridad médica frente a las demás.',
        ],
      },
    ],
    educationalBlock: {
      heading: '¿Qué significa realmente “propiedades de una planta”?',
      concepts: [
        { title: 'Composición', description: 'Qué sustancias contiene.' },
        { title: 'Uso tradicional', description: 'Cómo se ha utilizado históricamente.' },
        { title: 'Investigación científica', description: 'Qué compuestos o mecanismos han sido estudiados.' },
        { title: 'Evidencia clínica', description: 'Qué efectos han sido demostrados en personas.' },
      ],
    },
    educationalBlockAfterSection: 'Antioxidantes y Moronel',
    notice: 'Aviso informativo: los componentes y asociaciones descritos proceden de contenido herbolario histórico. No son consejo médico, diagnóstico ni tratamiento, no sustituyen medicamentos y no prueban eficacia clínica para prevenir o tratar enfermedades.',
    cta: {
      title: 'Conoce las presentaciones de Moronel',
      description: 'Explora los formatos actuales de Moronel y encuentra el que mejor se adapte a tu rutina.',
      href: '/tienda',
      label: 'Conocer las presentaciones de Moronel',
    },
  },
  {
    slug: 'contraindicaciones-del-moronel',
    title: 'Contraindicaciones del Moronel: precauciones y uso responsable',
    date: '19 de Marzo, 2026',
    description: 'Conoce las precauciones de uso del Moronel, posibles interacciones con medicamentos y recomendaciones durante embarazo, lactancia y otras situaciones especiales.',
    summary: 'Conoce las principales precauciones relacionadas con el uso de Moronel, especialmente en personas que toman medicamentos, durante embarazo, lactancia o en menores.',
    image: '/images/products/moronel-hierba-deshidratada.webp',
    imageAlt: 'Moronel en hierba deshidratada',
    category: 'USO RESPONSABLE',
    sections: [
      {
        heading: 'Introducción',
        paragraphs: [
          'Antes de incorporar cualquier producto herbolario a una rutina, conviene conocer sus indicaciones, conservarlo correctamente y considerar las circunstancias personales. Esta guía ofrece información general para acompañar una decisión responsable sobre el Moronel.',
          'La información aquí presentada no sustituye la consulta con un profesional de la salud. Ante dudas sobre medicamentos, embarazo, lactancia, menores o una condición médica, busca orientación individualizada.',
        ],
      },
      {
        heading: '¿El Moronel puede producir efectos secundarios?',
        paragraphs: [
          'El material histórico de la marca mencionaba posibles cambios intestinales o una sensación de aflojamiento del estómago. Esa referencia forma parte del contenido anterior y no permite anticipar cómo responderá cada persona.',
          'Las reacciones pueden variar según el producto, la persona y otros factores. No debe asumirse que cualquier efecto digestivo sea inofensivo ni ignorarse si causa malestar o preocupación.',
        ],
      },
      {
        heading: '¿Tiene contraindicaciones con medicamentos?',
        paragraphs: [
          'La página histórica indicaba ausencia de interacciones con medicamentos, pero esa afirmación no debe tomarse como garantía de seguridad. Las interacciones pueden depender de cada persona, del medicamento utilizado y de su situación de salud.',
          'Consulta con un profesional de salud antes de combinar Moronel con medicamentos. No se proporcionan dosis, combinaciones ni indicaciones para ajustar tratamientos en este artículo.',
        ],
      },
      {
        heading: 'Precaución con medicamentos que afectan la coagulación',
        paragraphs: [
          'El material anterior sugería precaución al usar productos asociados con la coagulación y citaba como ejemplos aspirina, clopidogrel, diclofenaco, ibuprofeno, naproxeno y dalteparina. Estos nombres se incluyen únicamente como ejemplos del contenido histórico de la marca.',
          'No se recomienda combinar Moronel con esos medicamentos ni con otros sin valoración profesional. Si tomas cualquier medicamento que pueda afectar la coagulación, consulta a tu médico o farmacéutico antes de usar productos herbolarios.',
        ],
      },
      {
        heading: 'Embarazo y lactancia',
        paragraphs: [
          'Durante el embarazo o la lactancia, consulta con un profesional de salud antes de utilizar Moronel o cualquier otro producto herbolario. Las necesidades y precauciones pueden variar en cada caso.',
          'El contenido histórico no es suficiente para establecer seguridad en estas etapas. Por ello, no debe usarse como sustituto de una recomendación clínica actualizada.',
        ],
      },
      {
        heading: 'Uso en niños',
        paragraphs: [
          'La página anterior hacía referencia a menores de 8 años, pero una edad concreta no constituye por sí sola un criterio médico definitivo. Consulta con un profesional antes de utilizar productos herbolarios en menores.',
          'No se incluyen recomendaciones de cantidad, frecuencia o edad de uso. La seguridad debe evaluarse de manera individual y con información vigente.',
        ],
      },
      {
        heading: 'Personas con condiciones médicas',
        paragraphs: [
          'Las personas con una condición médica, tratamiento en curso o antecedentes de reacciones a plantas y suplementos deben consultar a un profesional sanitario antes de incorporar productos herbolarios.',
          'Compartir con el profesional la lista de medicamentos y productos que utilizas puede ayudar a valorar posibles precauciones de forma adecuada.',
        ],
      },
      {
        heading: 'No sustituye tratamientos médicos',
        paragraphs: [
          'Moronel no sustituye medicamentos, diagnósticos, estudios, tratamientos ni la atención de profesionales de la salud. No suspendas ni modifiques un tratamiento prescrito basándote en contenido herbolario o comercial.',
          'Si tienes dudas sobre un síntoma o una condición de salud, busca atención profesional oportuna.',
        ],
      },
      {
        heading: '¿Qué hacer si aparece una reacción?',
        paragraphs: [
          'Si aparece malestar, una reacción inesperada o cualquier síntoma que te preocupe, suspende el uso y consulta a un profesional de la salud. En situaciones que parezcan urgentes, busca atención médica inmediata.',
          'Conserva el empaque y la información del producto para poder compartirlos con el profesional que te atienda.',
        ],
      },
      {
        heading: 'Presentaciones actuales',
        paragraphs: [
          'Actualmente, Moronel se ofrece como hierba deshidratada en bolsa de 240 gramos, gotas en frasco de 50 ml y cápsulas en frasco con 60 cápsulas. Revisa la etiqueta de la presentación elegida para sus indicaciones de conservación y uso.',
          'La elección de formato se relaciona con preferencia y practicidad; no representa una garantía de seguridad para todas las personas.',
        ],
      },
    ],
    notice: 'Aviso informativo: esta guía ofrece información general y contexto histórico. No es consejo médico, diagnóstico ni tratamiento. Consulta con un profesional de salud antes de combinar productos herbolarios con medicamentos o usarlos durante embarazo, lactancia, en menores o si tienes una condición médica.',
    cta: {
      title: 'Conoce las presentaciones de Moronel',
      description: 'Explora los formatos actuales de Moronel y consulta siempre la información de cada producto.',
      href: '/tienda',
      label: 'Conocer las presentaciones de Moronel',
    },
  },
];

export function getBlogArticle(slug: string) {
  return BLOG_ARTICLES.find((article) => article.slug === slug);
}
