import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { SEOHead } from "@/components/seo-head";

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen page-dark">
      <SEOHead
        title="Cookie Policy | Constancia"
        description="How Constancia uses cookies and similar technologies on our website. Details on cookie categories, your choices, and UK data protection compliance."
        keywords={["cookie policy", "cookies", "data protection", "website cookies", "Constancia cookies"]}
      />
      
      <Navigation />

      <main className="pt-16 sm:pt-20">
        <section className="py-12 bg-gradient-to-b from-brand-navy to-brand-teal">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Link 
                href="/" 
                className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
                data-testid="link-back-home"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Link>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4" data-testid="heading-cookie-policy">
                Cookie Policy
              </h1>
              <p className="text-lg text-white/80">
                Last updated: 1 May 2025
              </p>
            </motion.div>
          </div>
        </section>

        <section className="py-16 lg:py-24 bg-hp-primary">
          <div className="max-w-4xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="prose prose-lg prose-invert max-w-none"
            >
              <section className="mb-12" data-testid="section-about-cookies">
                <h2 className="text-2xl font-bold text-foreground mb-4">About This Cookie Policy</h2>
                <p className="text-muted-foreground mb-4">
                  The website https://constancia.io/ (the Site) is operated by 1QG GROUP LIMITED (we, us, our), a company incorporated in England and Wales under company number 16121837. Our registered office is at 86-90 Paul Street, London, EC2A 4NE, United Kingdom.
                </p>
                <p className="text-muted-foreground mb-4">
                  We are committed to protecting your privacy and complying with our data protection obligations under the Data Protection Act 2018 (the DPA 2018), the UK General Data Protection Regulation 2016/679 (the UK GDPR) and any other applicable UK legislation (together, Data Protection Law).
                </p>
                <p className="text-muted-foreground">
                  This policy was last updated on the date shown at the top. We may change this policy at any time by posting an updated version on the Site and will make reasonable efforts to bring any material changes to your attention. You may wish to check it before using the Site as any changes will be effective from the date that they are made.
                </p>
              </section>

              <section className="mb-12" data-testid="section-contact">
                <h2 className="text-2xl font-bold text-foreground mb-4">Contact Information</h2>
                <p className="text-muted-foreground">
                  If you have any concerns or would like further information about this policy in general, you can contact us at{" "}
                  <a 
                    href="mailto:info@constancia.com" 
                    className="text-brand-teal hover:underline"
                    data-testid="link-contact-email"
                  >
                    info@constancia.com
                  </a>.
                </p>
              </section>

              <section className="mb-12" data-testid="section-what-are-cookies">
                <h2 className="text-2xl font-bold text-foreground mb-4">What Are Cookies?</h2>
                <p className="text-muted-foreground">
                  Cookies are small text files that are stored on your computer when you visit the Site. It is standard practice to use cookies to make your experience better when using a website. We and our third-party service providers use cookies and similar technologies to collect information about, and relevant to, your usage of the Site.
                </p>
              </section>

              <section className="mb-12" data-testid="section-use-of-cookies">
                <h2 className="text-2xl font-bold text-foreground mb-4">Use of Cookies and Similar Technologies</h2>
                <p className="text-muted-foreground mb-6">
                  We use the following categories of cookies and similar technologies on this Site:
                </p>

                <div className="space-y-6">
                  <div className="p-6 rounded-xl bg-card border border-border/50">
                    <h3 className="text-lg font-semibold text-foreground mb-2">Strictly Necessary Cookies</h3>
                    <p className="text-muted-foreground">
                      These cookies are essential to enable you to move around the Site and use its features, and to keep the Site secure. Without these cookies, services you have asked for (such as remembering your login details or the items you placed in your basket) cannot be provided.
                    </p>
                  </div>

                  <div className="p-6 rounded-xl bg-card border border-border/50">
                    <h3 className="text-lg font-semibold text-foreground mb-2">Analytics Cookies</h3>
                    <p className="text-muted-foreground">
                      These cookies collect information about how you use the Site, for instance which pages you go to most often, what searches you perform and if you get error messages from web pages. Information these cookies collect can be used to improve how the Site works.
                    </p>
                  </div>

                  <div className="p-6 rounded-xl bg-card border border-border/50">
                    <h3 className="text-lg font-semibold text-foreground mb-2">Customisation Cookies</h3>
                    <p className="text-muted-foreground">
                      These cookies allow the Site to remember choices you make (such as your user name) and provide enhanced, more personal features. These cookies cannot track your browsing activity on other websites.
                    </p>
                  </div>

                  <div className="p-6 rounded-xl bg-card border border-border/50">
                    <h3 className="text-lg font-semibold text-foreground mb-2">Social Media Cookies</h3>
                    <p className="text-muted-foreground">
                      These cookies allow you to share your activity on the Site on social media such as Facebook and Twitter. These cookies are not within our control. Please refer to the privacy policies of the social networks in question for information regarding how their cookies work.
                    </p>
                  </div>

                  <div className="p-6 rounded-xl bg-card border border-border/50">
                    <h3 className="text-lg font-semibold text-foreground mb-2">Targeting or Advertising Cookies</h3>
                    <p className="text-muted-foreground">
                      These cookies record your visit to the Site, the pages you have visited and the links you have followed. We use this information to make our Site and the advertising displayed on it more relevant to your interests. We may also share this information with third parties for this purpose.
                    </p>
                  </div>
                </div>
              </section>

              <section className="mb-12" data-testid="section-cookie-consent">
                <h2 className="text-2xl font-bold text-foreground mb-4">Cookie Consent</h2>
                <p className="text-muted-foreground">
                  When you visit the Site for the first time (and periodically after that), we will request your consent to the setting of all cookies other than strictly necessary cookies.
                </p>
              </section>

              <section data-testid="section-manage-cookies">
                <h2 className="text-2xl font-bold text-foreground mb-4">How to Manage Cookies</h2>
                <p className="text-muted-foreground mb-4">
                  You can delete existing cookies and disable some or all types of cookies in future if you wish. To disable some or all types of cookies, you will have to either change the settings on your browser or use the cookie manager tool on the Site.
                </p>
                <p className="text-muted-foreground mb-4">
                  See{" "}
                  <a 
                    href="https://www.allaboutcookies.org/manage-cookies/" 
                    target="_blank" 
                    rel="nofollow noopener noreferrer"
                    className="text-brand-teal hover:underline"
                    data-testid="link-manage-cookies"
                  >
                    https://www.allaboutcookies.org/manage-cookies/
                  </a>{" "}
                  for information on how to change your browser settings. If you change your mind, you can enable cookies again at any time. Disabling cookies on your browser may stop the Site from working properly.
                </p>
                <p className="text-muted-foreground">
                  To find out more about cookies please visit{" "}
                  <a 
                    href="https://www.allaboutcookies.org" 
                    target="_blank" 
                    rel="nofollow noopener noreferrer"
                    className="text-brand-teal hover:underline"
                    data-testid="link-about-cookies"
                  >
                    www.allaboutcookies.org
                  </a>.
                </p>
              </section>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
