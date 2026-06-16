import { Redirect, useLocalSearchParams } from 'expo-router';

export default function AdminRedirectScreen() {
  const params = useLocalSearchParams<{ section?: string }>();

  if (params.section === 'tags') {
    return <Redirect href="/tags" />;
  }

  return <Redirect href="/categories" />;
}
