import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { CenteredPage } from "@/components/layout/CenteredPage";

export default function LoginPage() {
  return (
    <CenteredPage title="Sign In">
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </CenteredPage>
  );
}
