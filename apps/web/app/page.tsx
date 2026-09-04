import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { peutEtreAuthentifie } from './_lib/auth-cookies';

export default async function Home() {
  const cookieStore = await cookies();
  if (peutEtreAuthentifie(cookieStore)) {
    redirect('/planificateur');
  }
  redirect('/connexion');
}
