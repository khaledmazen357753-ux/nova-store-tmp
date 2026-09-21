export default function JsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Nova Store",
    url: "https://nova-store-tmp.vercel.app",
    description: "Nova Store is your one-stop online shop for quality products. Shop the latest trends with fast shipping and secure payments.",
    inLanguage: ["en-US", "ar-EG"],
    potentialAction: {
      "@type": "SearchAction",
      target: "https://nova-store-tmp.vercel.app/search?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Nova Store",
    url: "https://nova-store-tmp.vercel.app",
    logo: "https://nova-store-tmp.vercel.app/logo.png",
    description: "Nova Store - Your Ultimate Online Shopping Destination",
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+1-234-567-8900",
      contactType: "customer service",
      availableLanguage: ["English", "Arabic"],
    },
    sameAs: [
      "https://facebook.com/novastore",
      "https://twitter.com/novastore",
      "https://instagram.com/novastore",
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
    </>
  );
}
