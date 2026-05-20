import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const resources = {
  en: {
    translation: {
      nav: { browse: "Browse", categories: "Categories", how: "How it works", signin: "Sign in", signout: "Sign out", canada: "Canada" },
      hero: {
        badge: "Canada's modern business directory",
        title_pre: "Find the best of",
        title_city: "your city",
        title_post: "trusted by your neighbours.",
        subtitle: "Discover, review, and connect with verified local businesses across Canada. Smarter than Yelp. Friendlier than Kijiji.",
        placeholder: "Search restaurants, salons, mechanics…",
        search: "Search",
        feature1: "ID-verified reviewers",
        feature2: "One-click AI listings",
        feature3: "Real-time owner chat",
      },
      categories: { title: "Browse by category", subtitle: "Eight ways to find what you need today.", viewAll: "View all", explore: "Explore" },
      how: {
        title: "Built different.",
        subtitle: "A community for honest reviews and a launchpad for local businesses.",
        f1_title: "Honest reviews with photos", f1_body: "Verified locals share what they really thought, with the receipts.",
        f2_title: "AI-assisted listings", f2_body: "Owners describe their business once. AI writes the rest.",
        f3_title: "Claim & verify", f3_body: "Business owners verify ID to take control of their listing.",
      },
      cta: { title: "Own a business?", body: "Claim your spot on Spott.ca. Connect with locals, respond to reviews, and grow.", button: "Get started" },
      browse: {
        title: "Browse all businesses",
        listingsOne: "{{count}} listing", listingsOther: "{{count}} listings",
        searchByName: "Search by name", all: "All",
        emptyTitle: "No listings yet", emptyBody: "Be the first — sign in and add your business to Spott.ca.", addListing: "Add a listing",
        noPhoto: "No photo yet", newListing: "New listing",
      },
      footer: { madeIn: "Made in Canada" },
      theme: { light: "Light", dark: "Dark" },
      lang: { label: "Language" },
    },
  },
  fr: {
    translation: {
      nav: { browse: "Parcourir", categories: "Catégories", how: "Comment ça marche", signin: "Se connecter", signout: "Se déconnecter", canada: "Canada" },
      hero: {
        badge: "Le répertoire d'entreprises moderne du Canada",
        title_pre: "Découvrez le meilleur de",
        title_city: "votre ville",
        title_post: "recommandé par vos voisins.",
        subtitle: "Découvrez, évaluez et entrez en contact avec des entreprises locales vérifiées partout au Canada.",
        placeholder: "Restaurants, salons, mécaniciens…",
        search: "Rechercher",
        feature1: "Avis vérifiés par pièce d'identité",
        feature2: "Annonces IA en un clic",
        feature3: "Discussion en temps réel",
      },
      categories: { title: "Parcourir par catégorie", subtitle: "Huit façons de trouver ce qu'il vous faut.", viewAll: "Voir tout", explore: "Explorer" },
      how: {
        title: "Construit différemment.",
        subtitle: "Une communauté pour les avis honnêtes et un tremplin pour les entreprises locales.",
        f1_title: "Avis honnêtes avec photos", f1_body: "Des locaux vérifiés partagent leur véritable expérience, preuves à l'appui.",
        f2_title: "Annonces assistées par IA", f2_body: "Décrivez votre entreprise une fois. L'IA s'occupe du reste.",
        f3_title: "Revendiquer et vérifier", f3_body: "Les propriétaires vérifient leur identité pour contrôler leur fiche.",
      },
      cta: { title: "Vous avez une entreprise ?", body: "Réclamez votre place sur Spott.ca. Connectez-vous avec les locaux et grandissez.", button: "Commencer" },
      browse: {
        title: "Toutes les entreprises",
        listingsOne: "{{count}} fiche", listingsOther: "{{count}} fiches",
        searchByName: "Rechercher par nom", all: "Toutes",
        emptyTitle: "Aucune fiche pour l'instant", emptyBody: "Soyez le premier — connectez-vous et ajoutez votre entreprise.", addListing: "Ajouter une fiche",
        noPhoto: "Pas encore de photo", newListing: "Nouvelle fiche",
      },
      footer: { madeIn: "Fait au Canada" },
      theme: { light: "Clair", dark: "Sombre" },
      lang: { label: "Langue" },
    },
  },
  es: {
    translation: {
      nav: { browse: "Explorar", categories: "Categorías", how: "Cómo funciona", signin: "Iniciar sesión", signout: "Cerrar sesión", canada: "Canadá" },
      hero: {
        badge: "El directorio de negocios moderno de Canadá",
        title_pre: "Descubre lo mejor de",
        title_city: "tu ciudad",
        title_post: "recomendado por tus vecinos.",
        subtitle: "Descubre, reseña y conecta con negocios locales verificados en todo Canadá.",
        placeholder: "Restaurantes, salones, mecánicos…",
        search: "Buscar",
        feature1: "Reseñas verificadas con ID",
        feature2: "Anuncios IA en un clic",
        feature3: "Chat en tiempo real",
      },
      categories: { title: "Explorar por categoría", subtitle: "Ocho formas de encontrar lo que buscas.", viewAll: "Ver todo", explore: "Explorar" },
      how: {
        title: "Hecho diferente.",
        subtitle: "Una comunidad para reseñas honestas y una plataforma para negocios locales.",
        f1_title: "Reseñas honestas con fotos", f1_body: "Locales verificados comparten lo que realmente pensaron, con pruebas.",
        f2_title: "Anuncios con IA", f2_body: "Describe tu negocio una vez. La IA escribe el resto.",
        f3_title: "Reclamar y verificar", f3_body: "Los dueños verifican su ID para tomar control de su ficha.",
      },
      cta: { title: "¿Tienes un negocio?", body: "Reclama tu lugar en Spott.ca. Conecta con locales y crece.", button: "Empezar" },
      browse: {
        title: "Todos los negocios",
        listingsOne: "{{count}} ficha", listingsOther: "{{count}} fichas",
        searchByName: "Buscar por nombre", all: "Todas",
        emptyTitle: "Aún no hay fichas", emptyBody: "Sé el primero — inicia sesión y añade tu negocio.", addListing: "Añadir ficha",
        noPhoto: "Sin foto aún", newListing: "Nueva ficha",
      },
      footer: { madeIn: "Hecho en Canadá" },
      theme: { light: "Claro", dark: "Oscuro" },
      lang: { label: "Idioma" },
    },
  },
};

if (!i18n.isInitialized) {
  const isClient = typeof window !== "undefined";
  const chain = isClient ? i18n.use(LanguageDetector).use(initReactI18next) : i18n.use(initReactI18next);
  chain.init({
    resources,
    lng: isClient ? undefined : "en",
    fallbackLng: "en",
    supportedLngs: ["en", "fr", "es"],
    interpolation: { escapeValue: false },
    detection: isClient
      ? { order: ["localStorage", "navigator"], caches: ["localStorage"], lookupLocalStorage: "spott.lang" }
      : undefined,
  });
}

export default i18n;
