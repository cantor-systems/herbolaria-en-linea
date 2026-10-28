import { SanitaryClaim } from '@/types';

export const SHOW_UNAPPROVED_CLAIMS = false;

export const SANITARY_CLAIMS: SanitaryClaim[] = [
  {
    id: 'claim-1',
    title: 'Información Botánica sobre Moronel',
    body: 'El Moronel (Lonicera subspicata) es una especie vegetal de uso herbolario tradicional en diversas comunidades del norte de México.',
    type: 'traditional_use',
    approved: false,
    requiresLegalReview: true,
    requiresRegulatoryReview: true,
    source: 'Literatura Herbolaria Tradicional Mexicana',
    visible: true,
  },
  {
    id: 'claim-2',
    title: 'Aviso sobre Productos Herbales y Suplementos',
    body: 'Este producto es de origen vegetal. Este sitio no promociona ni afirma propiedades curativas, preventivas ni terapéuticas definitivas. No sustituye la consulta médica ni tratamientos prescritos.',
    type: 'warning',
    approved: false,
    requiresLegalReview: true,
    requiresRegulatoryReview: true,
    source: 'Lineamientos Legales de Comercio Electrónico Herbolario',
    visible: true,
  },
  {
    id: 'claim-3',
    title: 'Procesamiento de la Marca Herbazen',
    body: 'Los productos Herbazen son elaborados con materia prima seleccionada, deshidratada o extraída bajo procesos controlados de higiene y calidad en México.',
    type: 'ingredient',
    approved: false,
    requiresLegalReview: true,
    requiresRegulatoryReview: true,
    source: 'Ficha Técnica de Calidad Herbazen',
    visible: true,
  },
];
