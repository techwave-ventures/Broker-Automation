import { getSessionUser } from "@/lib/api";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
    const user = await getSessionUser();

    return <ProfileForm user={user} />;
}
