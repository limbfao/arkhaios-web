import { cookies, headers } from "next/headers";
import authenticate from "../util/authenticate";
import Redirect from "./components/redirect";
import { redirect } from "next/navigation";
import "./globals.css";
import { GeistSans } from "geist/font/sans";
import { Marcellus } from "next/font/google";
import Header from "./header";
import { UserContextProvider } from "./UserContext";
import SideBar from "./sidebar";
// Roman inscriptional serif for page titles and fund names
const display = Marcellus({ weight: "400", subsets: ["latin"], variable: "--font-display" });

export const metadata = {
  title: "Arkhaios",
  description: "Arkhaios",
};


export default async function RootLayout({ children }) {

  // Signed-out only pages (signed-in users are sent home)
  const loginPaths = ["/", "/login", "/signup", "/recovery", "/root-home"];
  // Pages anyone can see
  const isPublicPath = (path) => path?.startsWith("/legal/");

  const path = headers().get("x-url");
  const cookieStore = cookies();
  const email = cookieStore.get("email")?.value;
  const session = cookieStore.get("session")?.value;


  var user = await authenticate.login(email, session);
  
  if (user) {
    // Remove salt, iter, verificationCode, plaidID 
    const keysToFilter = ['salt', 'iter', 'verificationCode', 'plaidID'];

    // console.log("Before filter User: " + JSON.stringify(user));
    user = Object.keys(user).reduce((newUser, key) => {
      if (!keysToFilter.includes(key)) {
        newUser[key] = user[key];
      }
      return newUser;
    }, {});
    // console.log("After Filter User: " + JSON.stringify(user))
  }
  
  
  var allowAuthenticated = false;
  if (!user && !loginPaths.includes(path) && !isPublicPath(path)) {
    redirect("/login");
  } else if (user) {
    allowAuthenticated = true;
    if (loginPaths.includes(path)) {
      redirect("/home");
    } else if (!user.emailVerified) {
      allowAuthenticated = false;
      if (path != "/signup/verify" && !isPublicPath(path)) {
        redirect("/signup/verify");
      }
    }
  }



  const renderAuthenticatedContent = () => (
    <UserContextProvider user={user}>
      <header className="fixed inset-x-0 top-0 z-[100] h-16 border-b border-line bg-basalt/95 backdrop-blur">
        <Header user={user} />
      </header>
      <aside className="fixed bottom-0 left-0 top-16 z-[90] w-16 border-r border-line bg-basalt">
        <SideBar />
      </aside>
      <main className="min-h-screen pl-16 pt-16">{children}</main>
    </UserContextProvider>
  );

  const renderUnauthenticatedContent = () => <>{children}</>;

  return (
    <html
      data-theme="customBlackTheme"
      className={`${GeistSans.className} ${GeistSans.variable} ${display.variable}`}
      lang="en"
    >
      <head>
        <title>Arkhaios</title>
        <link
          rel="icon"
          type="image/x-icon"
          href="/trimmedNoBackgroundHDArkhaiosLogo.ico"
        ></link>
      </head>
      <body className={GeistSans.className}>
        <Redirect authenticated={user} />
        {allowAuthenticated ? renderAuthenticatedContent() : renderUnauthenticatedContent()}
      </body>
    </html>
  );
}
