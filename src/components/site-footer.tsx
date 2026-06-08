import { Link } from "@tanstack/react-router";
import { SpottLogo } from "@/components/SpottLogo";
import { NewsletterSignup } from "@/components/NewsletterSignup";


export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t border-border bg-card/40">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-1">
          <Link to="/" className="inline-flex items-center" aria-label="Spott home">
            <SpottLogo className="h-14 w-auto" width={180} height={52} />
          </Link>
          <p className="mt-3 text-xs text-muted-foreground">
            Canada's modern business directory. Discover, review, and support local.
          </p>
        </div>

        <nav aria-label="About">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground/80">About</div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/about" className="hover:text-foreground">About Spott</Link></li>
            <li><Link to="/" hash="how" className="hover:text-foreground">How it works</Link></li>
            <li><Link to="/faq" className="hover:text-foreground">FAQ</Link></li>
            <li><Link to="/terms" className="hover:text-foreground">Terms & Conditions</Link></li>
            <li><Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
            <li><Link to="/contact" className="hover:text-foreground">Contact Us</Link></li>
          </ul>
        </nav>

        <nav aria-label="Explore">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground/80">Explore</div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/directory" className="hover:text-foreground">Browse businesses</Link></li>
            <li><Link to="/for-business" className="hover:text-foreground">For Business</Link></li>
            <li><Link to="/pricing" className="hover:text-foreground">Pricing</Link></li>
            <li><Link to="/verify" className="hover:text-foreground">Get verified</Link></li>
            <li><Link to="/business/featured" className="hover:text-foreground">Featured placement</Link></li>
            <li><Link to="/business/new" className="hover:text-foreground">Add your business</Link></li>
            <li><Link to="/promoters" className="hover:text-foreground">Become a promoter</Link></li>
          </ul>
        </nav>

        <nav aria-label="Account">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground/80">Account</div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/auth" className="hover:text-foreground">Sign in</Link></li>
            <li><Link to="/dashboard" className="hover:text-foreground">Dashboard</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-border/60 bg-background/40">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:px-6 md:grid-cols-[1fr_minmax(0,420px)] md:items-center">
          <div>
            <div className="text-sm font-semibold text-foreground">Get the Spott.ca newsletter</div>
            <p className="text-xs text-muted-foreground">Local picks, new listings & deals across Canada. Unsubscribe anytime.</p>
          </div>
          <NewsletterSignup source="footer" />
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground sm:px-6">
          <span>© {year} Spott — Made in Canada.</span>
          <span className="flex gap-4">
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/contact" className="hover:text-foreground">Contact</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
