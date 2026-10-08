import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { CenteredPage } from "@/components/layout/CenteredPage";

export default function SignupPage() {
  return (
    <CenteredPage title="Create your account">
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </CenteredPage>
  );
}
