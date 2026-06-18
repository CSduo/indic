import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { useAdminLogin } from "@workspace/api-client-react";
import { Wordmark } from "../../components/Wordmark";

interface FormValues { email: string; password: string; }

export function AdminLogin() {
  const [, navigate] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const mutation = useAdminLogin();
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>();

  function onSubmit(data: FormValues) {
    setError(null);
    mutation.mutate(
      { data: { email: data.email, password: data.password } },
      {
        onSuccess: () => navigate("/admin/dashboard"),
        onError: () => setError("Invalid credentials. Please try again."),
      },
    );
  }

  const fieldStyle = {
    background: "var(--surface)",
    border: "1px solid var(--line-2)",
    color: "var(--ink)",
    fontFamily: "var(--font-ui)",
    borderRadius: "0.5rem",
    padding: "0.75rem 1rem",
    width: "100%",
    fontSize: "0.875rem",
    outline: "none",
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--bg)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Wordmark size="md" />
          </div>
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--muted-text)", fontFamily: "var(--font-ui)" }}>
            Editorial Dashboard
          </p>
        </div>

        <div
          className="rounded-xl p-6"
          style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--muted-text)", fontFamily: "var(--font-ui)" }}>
                Email
              </label>
              <input
                type="email"
                style={fieldStyle}
                placeholder="admin@anvikshiki.in"
                {...register("email", { required: true })}
              />
              {errors.email && <p className="text-xs mt-1" style={{ color: "var(--rose)" }}>Email is required</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--muted-text)", fontFamily: "var(--font-ui)" }}>
                Password
              </label>
              <input
                type="password"
                style={fieldStyle}
                placeholder="••••••••"
                {...register("password", { required: true })}
              />
              {errors.password && <p className="text-xs mt-1" style={{ color: "var(--rose)" }}>Password is required</p>}
            </div>

            {error && (
              <p className="text-xs text-center py-2 px-3 rounded-lg" style={{ color: "var(--rose)", background: "var(--surface-2)", fontFamily: "var(--font-ui)" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full py-3 rounded-lg text-sm font-semibold transition-all mt-2"
              style={{
                background: "var(--gold)",
                color: "var(--bg)",
                fontFamily: "var(--font-ui)",
                opacity: mutation.isPending ? 0.7 : 1,
              }}
            >
              {mutation.isPending ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
