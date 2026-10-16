import { FiArrowLeft } from 'react-icons/fi';
import AuthLayout from '@/components/site/AuthLayout';
import { LinkButton } from '@/components/ui/Button';

export default function ForgotPasswordPage() {
  return (
    <AuthLayout image="/images/three.jpg" eyebrow="Account recovery" title="Password Reset">
      <p className="leading-relaxed text-mute">
        Password reset isn&apos;t available in this demo build yet. For now, please use the
        Sign Up page to create a new account, or go back to Login.
      </p>
      <div className="mt-8 flex gap-3">
        <LinkButton href="/login"><FiArrowLeft aria-hidden /> Back to Login</LinkButton>
        <LinkButton href="/signup" variant="secondary">Sign Up</LinkButton>
      </div>
    </AuthLayout>
  );
}
