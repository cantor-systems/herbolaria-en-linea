import { NotFoundContent } from '@/components/NotFoundContent';
import { StorefrontShell } from '@/components/store/StorefrontShell';

export default function PublicNotFound() {
  return (
    <StorefrontShell>
      <NotFoundContent />
    </StorefrontShell>
  );
}
