'use client';

import { useState, useEffect, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';

const SkinAnalysisModal = lazy(() => import('@/components/SkinAnalysisModal'));
const ImagePreloader = lazy(() => import('@/components/ImagePreloader'));

const logoUrl = '/shiseido_logo.png';
const heroMenUrl = '/api/reference-image?id=heroMen';
const heroVitalUrl = '/api/reference-image?id=heroVital';
const heroUltimuneUrl = '/api/reference-image?id=heroUltimune';
const bestMicroClickUrl = '/api/reference-image?id=bestMicroClick';
const bestSkinEmpoweringUrl = '/api/reference-image?id=bestSkinEmpowering';
const bestSynchroUrl = '/api/reference-image?id=bestSynchro';
const bestUvCompactUrl = '/api/reference-image?id=bestUvCompact';
const bestUltimuneUrl = '/api/reference-image?id=bestUltimune';
const finderSerumUrl = '/api/reference-image?id=finderSerum';
const finderMoisturizerUrl = '/api/reference-image?id=finderMoisturizer';
const finderEyeUrl = '/api/reference-image?id=finderEye';
const finderFoundationUrl = '/api/reference-image?id=finderFoundation';
const categoryDayCreamUrl = '/api/reference-image?id=categoryDayCream';
const categorySerumsUrl = '/api/reference-image?id=categorySerums';
const categoryFoundationUrl = '/api/reference-image?id=categoryFoundation';
const serviceSerumUrl = '/api/reference-image?id=serviceSerum';
const serviceMoisturizerUrl = '/api/reference-image?id=serviceMoisturizer';
const serviceEyeUrl = '/api/reference-image?id=serviceEye';
const serviceShadeUrl = '/api/reference-image?id=serviceShade';
const editorialUltimuneUrl = '/api/reference-image?id=editorialUltimune';
const editorialBlueUrl = '/api/reference-image?id=editorialBlue';
const editorialVitalUrl = '/api/reference-image?id=editorialVital';
const editorialOfferUrl = '/api/reference-image?id=editorialOffer';

const announcementBar = '3 travel sizes as a gift with orders over 109 EUR';

const bestSellers = [
  {
    name: 'Concentrated Supreme Cream',
    image: 'https://www.shiseido.it/on/demandware.static/-/Sites-itemmaster_shiseido_emea/default/dw5790c13b/images/pdp-images/1_Resizing_Project/AW24_VPN/768614210108_1.jpg',
    url: '#',
    badges: ['Refill Available', 'For Mature Skin'],
    variantLabel: '2 Formati',
    shadeName: '',
    price: '163,00 EUR',
    size: '50ml',
    detailGroups: [
      { title: 'Skin type:', items: ['Dry', 'Oily'] },
      { title: 'Benefits:', items: ['Smoother skin', 'Sculpting effect'] },
    ],
  },
  {
    name: 'Microliner Ink',
    image: 'https://www.shiseido.it/on/demandware.static/-/Sites-itemmaster_shiseido_emea/default/dw950c6cb4/images/pdp-images/1_Resizing_Project/MicroLiner/729238147331_1-copie.jpg',
    url: '#',
    badges: ['Best Seller'],
    variantLabel: '10 Shades',
    shadeName: 'black 1',
    price: '31,00 EUR',
    size: '0,08 g',
    detailGroups: [
      { title: 'Benefits:', items: ['Intense Color', 'Waterproof'] },
      { title: 'Finish:', items: ['Matte'] },
    ],
  },
  {
    name: 'Uplifting And Firming Advanced Cream',
    image: 'https://www.shiseido.it/on/demandware.static/-/Sites-itemmaster_shiseido_emea/default/dw15b6992f/images/pdp-images/1_Resizing_Project/AW24_VPN/768614209973_1-(1).jpg',
    url: '#',
    badges: ['For Normal Skin'],
    variantLabel: '2 Formati',
    shadeName: '',
    price: '147,00 EUR',
    size: '50 ml',
    detailGroups: [
      { title: 'Skin type:', items: ['Dry', 'Oily'] },
      { title: 'Benefits:', items: ['Smoother skin', 'Firming'] },
    ],
  },
  {
    name: 'Liftdefine Radiance Night Concentrate',
    image: 'https://www.shiseido.it/on/demandware.static/-/Sites-itemmaster_shiseido_emea/default/dwaf04f42e/images/pdp-images/1_Resizing_Project/729238218260_1.jpg',
    url: '#',
    badges: ['Night'],
    variantLabel: '2 Formati',
    shadeName: '',
    price: '168,00 EUR',
    size: '40ml',
    detailGroups: [
      { title: 'Skin type:', items: ['Dry', 'Oily'] },
      { title: 'Benefits:', items: ['Smoother skin', 'Firming'] },
    ],
  },
  {
    name: 'Lipliner Ink Duo - Primer + Liner',
    image: 'https://www.shiseido.it/on/demandware.static/-/Sites-itemmaster_shiseido_emea/default/dw11b3d70b/images/pdp-images/1_Resizing_Project/LipLinner/729238164154_S_SMU_LipLiner_InkDuo_Bare01_1.jpg',
    url: '#',
    badges: [],
    variantLabel: '6 Shades',
    shadeName: 'nude warm beige bare',
    price: '34,00 EUR',
    size: '1,1g',
    detailGroups: [
      { title: 'Finish:', items: ['Matte'] },
      { title: 'Coverage:', items: ['Light'] },
    ],
  },
  {
    name: 'Uplifting And Firming Advanced Cream Enriched',
    image: 'https://www.shiseido.it/on/demandware.static/-/Sites-itemmaster_shiseido_emea/default/dw362a40e0/images/pdp-images/1_Resizing_Project/AW24_VPN/768614209973_1.jpg',
    url: '#',
    badges: ['Refill Available', 'For Dry Skin'],
    variantLabel: '2 Formati',
    shadeName: '',
    price: '147,00 EUR',
    size: '50 ml',
    detailGroups: [
      { title: 'Skin type:', items: ['Dry', 'Normal'] },
      { title: 'Benefits:', items: ['Smoother skin', 'Firming'] },
    ],
  },
  {
    name: 'Overnight Firming Treatment',
    image: 'https://www.shiseido.it/on/demandware.static/-/Sites-itemmaster_shiseido_emea/default/dw76837e45/images/pdp-images/1_Resizing_Project/AW24_VPN/768614210283_1.jpg',
    url: '#',
    badges: ['Night'],
    variantLabel: '2 Formati',
    shadeName: '',
    price: '161,00 EUR',
    size: '50 ml',
    detailGroups: [
      { title: 'Skin type:', items: ['Dry', 'Oily'] },
      { title: 'Benefits:', items: ['Smoother skin', 'Firming'] },
    ],
  },
  {
    name: 'Controlledchaos Mascaraink',
    image: 'https://www.shiseido.it/on/demandware.static/-/Sites-itemmaster_shiseido_emea/default/dw9f48153d/images/pdp-images/1_Resizing_Project/730852147669---ControlledChaos-MascaraInk_Black-Pulse-01_1.jpg',
    url: '#',
    badges: [],
    variantLabel: '4 Shades',
    shadeName: 'black pulse 01',
    price: '41,00 EUR',
    size: '11,5 ml',
    detailGroups: [
      { title: 'Skin type:', items: ['All skin types'] },
    ],
  },
  {
    name: 'Colorgel Lipbalm',
    image: 'https://www.shiseido.it/on/demandware.static/-/Sites-itemmaster_shiseido_emea/default/dwcdffced2/images/pdp-images/1_Resizing_Project/ColorGel_LipBalm/729238148932_Hibiscus104_1.jpg',
    url: '#',
    badges: ['Offer'],
    variantLabel: '7 Shades',
    shadeName: 'hibiscus sheer pink',
    price: '27,00 EUR',
    oldPrice: '36,00 EUR',
    size: '2g',
    detailGroups: [
      { title: 'Finish:', items: ['Radiant'] },
      { title: 'Coverage:', items: ['Full'] },
    ],
  },
  {
    name: 'Uplifting And Firming Advanced Cream Soft',
    image: 'https://www.shiseido.it/on/demandware.static/-/Sites-itemmaster_shiseido_emea/default/dw0ce4c362/images/pdp-images/SS25/VPN/2.jpg',
    url: '#',
    badges: ['For Normal & Combination Skin', 'Lightweight Texture'],
    variantLabel: '2 Formati',
    shadeName: '',
    price: '147,00 EUR',
    size: '50ml',
    detailGroups: [
      { title: 'Skin type:', items: ['Oily', 'Normal'] },
      { title: 'Benefits:', items: ['Smoother skin', 'Firming'] },
    ],
  },
];

const finderCards = [
  { title: 'Find Serum', tone: 'bg-[#f3f0ea]', image: finderSerumUrl },
  { title: 'Find Moisturizer', tone: 'bg-[#e4f0ff]', image: finderMoisturizerUrl },
  { title: 'Find Eye Treatment', tone: 'bg-[#f6ecee]', image: finderEyeUrl },
  { title: 'Find Your Foundation', tone: 'bg-[#f1efe8]', image: finderFoundationUrl },
];

const categoryTiles = [
  { title: 'Day Creams', tone: 'bg-[#f5ede5]', image: categoryDayCreamUrl },
  { title: 'Face Serums', tone: 'bg-[#eef4ff]', image: categorySerumsUrl },
  { title: 'Foundations', tone: 'bg-[#f4f1e8]', image: categoryFoundationUrl },
];

const servicesCards = [
  { title: 'Find Serum', subtitle: 'Personalized test', image: serviceSerumUrl },
  { title: 'Find Moisturizer', subtitle: 'Guided selection', image: serviceMoisturizerUrl },
  { title: 'Find Eye Treatment', subtitle: 'Eye care path', image: serviceEyeUrl },
  { title: 'Find Your Foundation', subtitle: 'Shade matching', image: serviceShadeUrl },
];

const campaignTiles = [
  { title: 'ULTIMUNE', tone: 'bg-[#be0a2f]', text: 'text-white', image: editorialUltimuneUrl },
  { title: 'SHISEIDO', tone: 'bg-[#283bbf]', text: 'text-white', image: editorialBlueUrl },
  { title: 'VITAL PERFECTION', tone: 'bg-[#c92a46]', text: 'text-white', image: editorialVitalUrl },
  { title: 'OFFER', tone: 'bg-[#efefef]', text: 'text-black', image: editorialOfferUrl },
];

const ultimeOccasioni = [
  { name: 'Ultimune Power Infusing Concentrate', price: '60,00 EUR', oldPrice: '80,00 EUR', image: heroUltimuneUrl },
  { name: 'Brow Inktrio', price: '23,25 EUR', oldPrice: '31,00 EUR', image: heroVitalUrl },
  { name: 'Plumped & Firm Skin Ritual', price: '195,00 EUR', oldPrice: '260,00 EUR', image: heroMenUrl },
  { name: 'Tanning Compact Foundation SPF6', price: '29,25 EUR', oldPrice: '39,00 EUR', image: heroUltimuneUrl },
  { name: 'Ginza Eau De Parfum Intense', price: '53,25 EUR', oldPrice: '71,00 EUR', image: heroVitalUrl },
  { name: 'Shimmer Gel Gloss', price: '22,50 EUR', oldPrice: '30,00 EUR', image: heroMenUrl },
];

export default function Home() {
  const { t } = useTranslation('common');
  const [showModal, setShowModal] = useState(false);
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [isModalReady, setIsModalReady] = useState(false);
  const [imagesPreloaded, setImagesPreloaded] = useState(false);
  const [isSkinChatOpen, setIsSkinChatOpen] = useState(false);

  useEffect(() => {
    const isInIframe = window.parent !== window;
    const urlParams = new URLSearchParams(window.location.search);
    const isShopifyEmbed = urlParams.get('embed') === 'true' || urlParams.get('shopify') === 'true';
    setIsEmbedded(isInIframe || isShopifyEmbed);
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'OPEN_SKIN_ANALYSIS') {
        setShowModal(true);
      } else if (event.data.type === 'CLOSE_SKIN_ANALYSIS') {
        setShowModal(false);
      } else if (event.data.type === 'DEMO_FAST_CLOSED') {
        setIsSkinChatOpen(false);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleModalReady = () => {
    setIsModalReady(true);
  };

  const handleImagesPreloaded = () => {
    setImagesPreloaded(true);
    if (isEmbedded) {
      setShowModal(true);
    }
  };

  useEffect(() => {
    if (!showModal) {
      setIsModalReady(false);
    }
  }, [showModal]);

  useEffect(() => {
    if (showModal && !isModalReady) {
      const fallbackTimer = setTimeout(() => {
        setIsModalReady(true);
      }, 2000);
      return () => clearTimeout(fallbackTimer);
    }
  }, [showModal, isModalReady]);

  useEffect(() => {
    if (!isSkinChatOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSkinChatOpen(false);
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isSkinChatOpen]);

  const handleCloseModal = () => {
    setShowModal(false);
    if (isEmbedded && window.parent !== window) {
      window.parent.postMessage({ type: 'SKIN_ANALYSIS_CLOSED', payload: {} }, '*');
    }
  };

  if (isEmbedded) {
    return (
      <div className="relative h-full w-full">
        <Suspense
          fallback={
            <div className="flex h-full w-full items-center justify-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="loader__wrapper">
                  <div className="loader">&nbsp;</div>
                </div>
                <p className="text-sm text-gray-600">{t('home.loading_skin_analysis')}</p>
              </div>
            </div>
          }
        >
          {!imagesPreloaded ? (
            <div>{t('home.loading')}</div>
          ) : (
            <SkinAnalysisModal isOpen={showModal} onClose={handleCloseModal} embedded={true} onReady={handleModalReady} />
          )}
        </Suspense>
      </div>
    );
  }

  return (
    <div className="sh-home min-h-screen bg-[#f1f1f1]">
      <div className="sh-top-banner">{announcementBar}</div>

      <header className="sh-header">
        <div className="sh-header-inner">
          <div className="sh-header-row">
            <div className="sh-logo">
              <img src={logoUrl} alt="Shiseido" className="h-10 w-auto" />
            </div>
            <div className="sh-search">
              <input placeholder="Search by product, concern or line" aria-label="search" />
            </div>
            <div className="hidden items-center gap-4 text-white md:flex">
              <span aria-hidden>?</span>
              <span aria-hidden>U</span>
              <span aria-hidden>Cart</span>
            </div>
          </div>
          <nav className="sh-nav">
            <a href="#novita" className="sh-nav-link">New In</a>
            <a href="#categorie" className="sh-nav-link">Skincare</a>
            <a href="#bestseller" className="sh-nav-link">Makeup</a>
            <a href="#occasioni" className="sh-nav-link sh-nav-link-red">Promotions</a>
            <a href="#servizi" className="sh-nav-link">Services</a>
            <a href="#editoriale" className="sh-nav-link">Explore</a>
          </nav>
        </div>
      </header>

      <main>
        <section id="novita" className="mx-auto grid w-full max-w-[1200px] gap-0 bg-[#efefef] md:grid-cols-2">
          <div className="md:order-2 flex flex-col justify-center px-8 py-10 md:px-10">
            <p className="mb-3 text-[11px] uppercase tracking-[0.25em] text-[#c8102e]">Promo</p>
            <h1 className="sh-hero-title">-30% on the men&apos;s category</h1>
            <p className="mt-4 max-w-xl text-[14px] leading-6 text-black/80">
              Celebrate his uniqueness with a tailored ritual: -30% on favorites and a complimentary kit above the order threshold.
            </p>
            <div className="mt-6">
              <a className="sh-btn-primary !min-w-[220px]" href="#">Shop now</a>
            </div>
          </div>
          <div className="md:order-1">
            <img src={heroMenUrl} alt="Men hero" className="h-full min-h-[260px] w-full object-cover" />
          </div>
        </section>

        <section id="bestseller" className="mx-auto w-full max-w-[1200px] bg-white px-6 py-10">
          <h2 className="sh-section-title mb-8">Best sellers</h2>
          <div className="recommendation carousel-recommendations row homepage-bestseller-carousel" id="recommendation">
            <div className="slick-btn-wrapper slick-arrow slick-disabled" aria-disabled="true">
              <button className="slick-prev" aria-label="Previous" type="button">
                <span className="prev" />
              </button>
            </div>
            <div className="slick-list draggable">
              <div className="slick-track">
                {bestSellers.map((product, index) => (
                  <div
                    key={product.name}
                    className="slick-slide slick-active"
                    data-slick-index={index}
                    aria-hidden="false"
                  >
                    <div>
                      <div className={`recommendation-slide item-${index + 1}`}>
                        <div className="product-tile-outer">
                          <div className="product-tile-inner transactional">
                            <div className="product-tile product-list-item">
                              <div className="product-image product-tile-plp">
                                <div className="badge-container">
                                  {product.badges.map((badge) => (
                                    <h4 key={badge} className="badge-product">
                                      <p>{badge}</p>
                                    </h4>
                                  ))}
                                </div>
                                <div className="product-packshot-wrapper">
                                  <a className="thumb-link" href={product.url}>
                                    <img className="thumb-image" src={product.image} alt={product.name} />
                                    <div className="tile-image-tint" />
                                  </a>
                                </div>
                              </div>

                              <div className="product-tile-info">
                                <div className="product-brand-name-block display-price-default">
                                  <div className="bv-tiles-wrapper">
                                    <div className="bv-rating-wrapper">★★★★★</div>
                                  </div>
                                  <a className="name-link" href={product.url} title={product.name}>
                                    <h5 className="product-name">{product.name}</h5>
                                  </a>
                                </div>

                                <div className="product-variants-wrapper">
                                  <div className="product-variants">
                                    <span className="variant-details">
                                      {product.variantLabel}
                                      {product.shadeName ? <span className="shade-name"> - {product.shadeName}</span> : null}
                                    </span>
                                  </div>
                                </div>

                                <div className="product-pricing display-price-default">
                                  <a className="pdp-link" href={product.url}>
                                    <div className="product-price product-price-value">
                                      <h2 className="price-sales">{product.price}</h2>
                                    </div>
                                  </a>
                                  <a className="pdp-link" href={product.url}>
                                    <div className="attribute single-size">
                                      <div className="value">
                                        <span>{product.size}</span>
                                      </div>
                                    </div>
                                  </a>
                                  {product.oldPrice ? (
                                    <div className="ominibus-price-wrapper">
                                      <div className="ominibus-original-price-block">
                                        <p className="ominibus-minimum-list-price">
                                          <span className="text">Previously:</span>
                                          <span className="ominibus-price-standard">{product.oldPrice}</span>
                                        </p>
                                      </div>
                                    </div>
                                  ) : null}
                                </div>

                                {product.detailGroups.map((group) => (
                                  <div key={group.title} className="skin-description type-benefits">
                                    <h3 className="skin-type-title">{group.title}</h3>
                                    <ul className="skin-type-list">
                                      {group.items.map((item) => (
                                        <li key={item} className="skin-type-item">
                                          {item}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="slick-btn-wrapper slick-arrow" aria-disabled="false">
              <button className="slick-next" aria-label="Next" type="button">
                <span className="next" />
              </button>
            </div>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-[1200px] gap-0 bg-[#efefef] md:grid-cols-2">
          <div>
            <img src={heroVitalUrl} alt="Hero Vital Perfection" className="h-full min-h-[260px] w-full object-cover" />
          </div>
          <div className="flex flex-col justify-center px-8 py-10 md:px-10">
            <p className="mb-3 text-[11px] uppercase tracking-[0.25em] text-[#c8102e]">New In</p>
            <h2 className="sh-hero-title">Vital Perfection New-In Kit</h2>
            <p className="mt-4 max-w-xl text-[14px] leading-6 text-black/80">
              New anti-aging serum, day cream and night cream in practical travel sizes.
            </p>
            <div className="mt-6">
              <a className="sh-btn-primary !min-w-[220px]" href="#">Discover now</a>
            </div>
          </div>
        </section>

        <section id="categorie" className="mx-auto w-full max-w-[1200px] bg-white px-6 py-10">
          <div className="grid gap-4 md:grid-cols-4">
            {finderCards.map((card) => (
              <article key={card.title} className={`${card.tone} border border-black/10 p-4`}>
                <img src={card.image} alt={card.title} className="h-24 w-full object-cover" />
                <h3 className="mt-4 text-[13px] uppercase tracking-[0.08em]">{card.title}</h3>
                <p className="mt-1 text-[11px] text-black/70">Take our quiz</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1200px] bg-white px-6 py-8">
          <div className="grid gap-4 md:grid-cols-3">
            {categoryTiles.map((tile) => (
              <article key={tile.title} className={`${tile.tone} border border-black/10 p-3`}>
                <img src={tile.image} alt={tile.title} className="h-36 w-full object-cover" />
                <h3 className="mt-3 text-center text-xs uppercase tracking-[0.15em]">{tile.title}</h3>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-[1200px] gap-0 bg-[#efefef] md:grid-cols-2">
          <div>
            <img src={heroUltimuneUrl} alt="Hero Ultimune" className="h-full min-h-[260px] w-full object-cover" />
          </div>
          <div className="flex flex-col justify-center px-8 py-10 md:px-10">
            <p className="mb-3 text-[11px] uppercase tracking-[0.25em] text-[#c8102e]">New In</p>
            <h2 className="sh-hero-title">Ultimune Power Infusing Oil</h2>
            <p className="mt-4 max-w-xl text-[14px] leading-6 text-black/80">
              Ultra-light oil texture, deeply hydrating, improving radiance and reducing visible signs of aging.
            </p>
            <div className="mt-6">
              <a className="sh-btn-primary !min-w-[220px]" href="#">Discover now</a>
            </div>
          </div>
        </section>

        <section id="servizi" className="mx-auto w-full max-w-[1200px] bg-white px-6 py-10">
          <h2 className="sh-section-title mb-8">Discover our online services</h2>
          <div className="grid gap-4 md:grid-cols-4">
            {servicesCards.map((service) => (
              <article key={service.title} className="border border-black/15 p-3">
                <img src={service.image} alt={service.title} className="h-28 w-full object-cover" />
                <h3 className="mt-3 text-[12px] uppercase tracking-[0.08em]">{service.title}</h3>
                <p className="mt-1 text-[11px] text-black/70">{service.subtitle}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="editoriale" className="mx-auto w-full max-w-[1200px] bg-white px-6 pb-8">
          <div className="grid gap-4 md:grid-cols-4">
            {campaignTiles.map((tile) => (
              <article key={tile.title} className={`${tile.tone} ${tile.text} border border-black/10 p-4`}>
                <img src={tile.image} alt={tile.title} className="h-24 w-full object-cover" />
                <h3 className="mt-3 text-[12px] uppercase tracking-[0.12em]">{tile.title}</h3>
              </article>
            ))}
          </div>
        </section>

        <section id="occasioni" className="mx-auto w-full max-w-[1200px] bg-white px-6 py-10">
          <div className="mb-8 flex items-end justify-between gap-4">
            <h2 className="sh-section-title">Latest Offers</h2>
            <span className="text-xs uppercase tracking-[0.2em] text-black/60">Featured deals</span>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ultimeOccasioni.map((item) => (
              <article key={item.name} className="sh-product-tile p-5">
                <img src={item.image} alt={item.name} className="h-48 w-full object-cover" />
                <h3 className="sh-product-name mt-4 min-h-14 text-2xl leading-tight">{item.name}</h3>
                <p className="mt-3">
                  <span className="mr-2 line-through opacity-60">{item.oldPrice}</span>
                  <span className="sh-price">{item.price}</span>
                </p>
                <a href="#" className="sh-btn-primary mt-5 w-full">
                  Shop now
                </a>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="sh-footer">
        <div className="mx-auto grid w-full max-w-[1200px] gap-8 px-6 py-12 md:grid-cols-3">
          <div>
            <h3 className="sh-footer-title">Newsletter</h3>
            <p className="mt-3 text-sm uppercase">Get new launches, offers and exclusive rituals.</p>
            <input className="sh-newsletter-input mt-4" placeholder="Your email" />
          </div>
          <div>
            <h3 className="sh-footer-title">Services</h3>
            <p className="mt-3 text-[15px] uppercase">Free returns - Secure payments - Dedicated support</p>
          </div>
          <div className="space-y-2">
            <h3 className="sh-footer-title">Useful links</h3>
            <a className="sh-footer-link block" href="#bestseller">Best sellers</a>
            <a className="sh-footer-link block" href="#servizi">Online services</a>
            <a className="sh-footer-link block" href="#occasioni">Latest offers</a>
          </div>
        </div>
        <div className="border-t border-white/20 px-6 py-4 text-center text-xs uppercase tracking-[0.15em] text-white/70">
          Dermaself x Luxury Skincare Experience - Replica statica layout Shiseido
        </div>
      </footer>

      <div className="hidden">
        <Suspense>
          {showModal ? (
            <ImagePreloader onComplete={handleImagesPreloaded}>
              <SkinAnalysisModal isOpen={showModal} onClose={handleCloseModal} embedded={false} />
            </ImagePreloader>
          ) : (
            <SkinAnalysisModal isOpen={showModal} onClose={handleCloseModal} embedded={false} />
          )}
        </Suspense>
      </div>

      {!isSkinChatOpen ? (
        <button
          type="button"
          onClick={() => setIsSkinChatOpen(true)}
          className="fixed bottom-[max(16px,env(safe-area-inset-bottom))] right-[max(16px,env(safe-area-inset-right))] z-[9999] w-[min(420px,calc(100vw-24px))] overflow-hidden rounded-none border border-black/20 bg-white px-6 pb-6 pt-5 text-left shadow-[0_20px_45px_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_52px_rgba(0,0,0,0.24)]"
          aria-label="Open AI Skin Analysis"
        >
          <span className="relative block text-[13px] font-bold uppercase tracking-[0.09em] text-[#c8102e]">
            NEW
          </span>
          <span className="relative mt-1 block text-[54px] font-semibold uppercase leading-[0.9] tracking-[-0.015em] text-[#1d2128]">
            AI SKIN ANALYSIS
          </span>
          <span className="relative mt-3 block text-[19px] font-medium leading-tight text-[#1d2128]">
            Discover your skin with AI
          </span>

          <span className="relative mt-5 flex h-14 w-full items-center justify-center rounded-none border border-[#c8102e] bg-[#c8102e] text-[17px] font-semibold uppercase tracking-[0.04em] text-white shadow-[0_8px_18px_rgba(200,16,46,0.35)]">
            Analyze your skin
            <span className="ml-3 text-[30px] leading-none">→</span>
          </span>
        </button>
      ) : null}

      {isSkinChatOpen ? (
        <div className="fixed inset-0 z-[9998] flex items-stretch justify-stretch bg-black/45 p-0 md:items-center md:justify-center md:p-4">
          <div className="relative h-full w-full overflow-hidden rounded-none bg-white shadow-none md:h-[min(100vh-32px,960px)] md:w-[540px] md:shadow-2xl">
            <iframe
              src="/demo-fast?embed=true&locale=en"
              title="Dermaself Demo Fast - Skin Analysis"
              className="h-full w-full border-0"
              loading="lazy"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
