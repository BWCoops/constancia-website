import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Footer } from "@/components/footer";
import { SEOHead } from "@/components/seo-head";

export default function TermsOfUsePage() {
  return (
    <div className="marketing-page">
      <SEOHead
        title="Terms of Use | Constancia"
        description="Terms of Use for the Constancia Holdings Limited website. Conditions governing access to our advisory platform, tools, and resources for finance professionals."
        keywords={["terms of use", "terms and conditions", "website terms", "Constancia terms", "legal terms"]}
      />
      

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
              <h1 className="text-4xl md:text-5xl font-semibold text-white mb-4" data-testid="heading-terms-of-use">
                Terms of Use
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
              className="prose prose-lg max-w-none"
            >
              <section className="mb-12" data-testid="section-about-terms">
                <h2 className="text-2xl font-semibold text-foreground mb-4">About these Terms of Use</h2>
                <p className="text-muted-foreground mb-4">
                  We are Constancia Holdings Limited, incorporated in England and Wales under company registration number 17227112. Our registered office is at Blount House, Hall Court, Hall Park Way, Telford, Shropshire, TF3 4NQ, United Kingdom.
                </p>
                <p className="text-muted-foreground mb-4">
                  These Terms of Use apply to the use of this website, regardless of how you access it. Please read these Terms of Use carefully before you proceed.
                </p>
                <p className="text-muted-foreground">
                  We may, at any time and without notice, terminate your access to or use of this website. If we do so, you do not have the right to bring any claim or claims against us.
                </p>
              </section>

              <section className="mb-12" data-testid="section-consent">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Consent to Terms of Use</h2>
                <p className="text-muted-foreground mb-4">
                  By using this website you agree to these Terms of Use.
                </p>
                <p className="text-muted-foreground">
                  If you do not agree to these Terms of Use, please do not use this website. These Terms of Use were last updated on the date shown above. We may change these Terms of Use at any time by posting an updated version on our website, so you should check the latest version before using this website. You may only use this website for lawful purposes.
                </p>
              </section>

              <section className="mb-12" data-testid="section-copyright">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Copyright notice</h2>
                <p className="text-muted-foreground mb-4">
                  Unless we expressly state otherwise, the copyright and any other intellectual property rights, including but not limited to design rights, trade marks and patents appearing anywhere on this website remain our property, whether owned by or licensed to us.
                </p>
                <p className="text-muted-foreground">
                  You may not use any of the material on this website without our prior written permission for your own commercial purposes, whether by reproducing, copying, downloading, printing, linking to, editing, broadcasting, distributing or otherwise. You may use it for your own personal non-commercial use.
                </p>
              </section>

              <section className="mb-12" data-testid="section-disclaimer">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Disclaimer</h2>
                <p className="text-muted-foreground mb-4">
                  Accessing or using this website or its content in any way is done entirely at your own risk. You will be responsible for any loss or damage to any computer, device, software, systems or data resulting directly or indirectly from the use or inability to use this website or its content.
                </p>
                <p className="text-muted-foreground mb-4">
                  We are under no obligation to provide uninterrupted access to this website. We reserve the right to restrict your access to this website at any time and for any reason.
                </p>
                <p className="text-muted-foreground mb-4">
                  We do not guarantee that the contents of this website will be free of errors, bugs, worms, trojans or viruses or otherwise make any representations as to the quality or accuracy or completeness of the content available on the website including, but not limited to any price quotes, stock availability data or non-fraudulent representations. You are responsible for maintaining appropriate software on your computer or device to protect you from any such errors, bugs, worms, trojans or viruses.
                </p>
                <p className="text-muted-foreground mb-4">
                  To the fullest extent permissible by law, we exclude any and all liability to you resulting from your use of the website or connected to these Terms of Use. This exclusion includes but is not limited to any type of damages, loss of data, income or profit or loss or damage to property belonging to you or third parties arising from the use of this website or its contents.
                </p>
                <p className="text-muted-foreground">
                  Nothing in these Terms of Use is intended to limit our liability to you for death or personal injury resulting from our negligence or that of our employees or agents.
                </p>
              </section>

              <section className="mb-12" data-testid="section-third-party-links">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Links to third party websites</h2>
                <p className="text-muted-foreground">
                  This website may provide links out to websites or other online resources under the control of third parties. Any such links are provided solely for your convenience. We have no control over the contents of these third-party resources. We are not responsible for the contents of any linked websites and do not endorse them in any way.
                </p>
              </section>

              <section className="mb-12" data-testid="section-links-from-third-party">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Links from third party websites</h2>
                <p className="text-muted-foreground">
                  You can link to this website, so long as you do so fairly and without suggesting any affiliation, endorsement, approval or association with Constancia Holdings Limited if there is none. We reserve the right to withdraw permission to link to our site at any time.
                </p>
              </section>

              <section className="mb-12" data-testid="section-privacy-policy">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Privacy policy</h2>
                <p className="text-muted-foreground">
                  We take your privacy and the protection of your data very seriously. We may gather and/or use certain information about you in accordance with our privacy policy. Please see our separate{" "}
                  <Link 
                    href="/privacy" 
                    className="text-brand-teal hover:underline"
                    data-testid="link-privacy-policy"
                  >
                    privacy policy
                  </Link>{" "}
                  for more information.
                </p>
              </section>

              <section className="mb-12" data-testid="section-entire-agreement">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Entire agreement</h2>
                <p className="text-muted-foreground">
                  These Terms of Use are the entire agreement between us and you, and supersede any and all prior terms, conditions, warranties or representations to the fullest extent permitted by law.
                </p>
              </section>

              <section data-testid="section-applicable-law">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Applicable law</h2>
                <p className="text-muted-foreground">
                  This Agreement shall be governed by the law of England and courts of England and Wales will have exclusive jurisdiction in relation to these Terms of Use.
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
