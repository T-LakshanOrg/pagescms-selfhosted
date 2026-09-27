import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SignIn } from "@/components/sign-in";
import { getSafeRedirect } from "@/lib/auth-redirect";
import { getSignInBranding, getSignInSite } from "@/lib/branding";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; site?: string }>;
}) {  
  const requestHeaders = await headers();
  const resolvedSearchParams = await searchParams;
  const session = await auth.api.getSession({
    headers: requestHeaders,
  });
  const safeRedirect = getSafeRedirect(resolvedSearchParams.redirect);

  // Fork addition: brand the page for the site the link points to.
  const site = getSignInSite(resolvedSearchParams.site, safeRedirect);
  const branding = site ? await getSignInBranding(site.owner, site.repo) : null;
  const defaultRedirect = branding ? `/${branding.owner}/${branding.repo}` : "/";
  const afterSignIn = safeRedirect === "/" ? defaultRedirect : safeRedirect;

  if (session?.user) return redirect(afterSignIn === "/sign-in" ? "/" : afterSignIn);

	return (
    <>
      {branding?.fontsUrl && <link rel="stylesheet" href={branding.fontsUrl} />}
      {branding?.css && <style dangerouslySetInnerHTML={{ __html: branding.css }} />}
      <SignIn
        defaultRedirect={defaultRedirect}
        branding={branding ? { name: branding.name, logo: branding.logo } : undefined}
      />
    </>
  );
}
