import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function Home() {
  const cookieStore = await cookies();
  if (cookieStore.get('access_token')) {
    redirect('/planificateur');
  }
  redirect('/connexion');
}
