import { auth0 } from "@/lib/auth0";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
    const session = await auth0.getSession();
    const user = session?.user ? {
      name: session.user.name || null,
      email: session.user.email || null,
      picture: session.user.picture || null,
    } : null;

    return <ProfileForm user={user} />;
}
