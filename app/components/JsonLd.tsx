export default function JsonLd() {
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Nova Store",
    url: "https://nova-store-tmp.vercel.app",
    description: "أحذية وبنطلونات مختارة بعناية لتكمل إطلالتك اليومية.",
    inLanguage: "ar-EG",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://nova-store-tmp.vercel.app/products?search={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Nova Store",
    url: "https://nova-store-tmp.vercel.app",
    description: "اختيارات يومية بأسلوب واضح وجودة تستحقها.",
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+20-100-000-0000",
      contactType: "customer service",
      availableLanguage: ["Arabic"],
    },
  };

  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} /></>;
}
