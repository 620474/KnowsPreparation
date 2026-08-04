import { useState, type FormEvent } from "react";
import { Button, PasswordInput, TextInput } from "@mantine/core";
import { ArrowRight, Database, LockKeyhole, Smartphone } from "lucide-react";

import { DEFAULT_API_URL, login } from "../api";

interface LoginScreenProps {
  onSuccess: () => void;
}

export function LoginScreen({ onSuccess }: LoginScreenProps) {
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsPending(true);
    try {
      await login(apiUrl, password);
      onSuccess();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Не удалось войти");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-copy">
        <div className="brand-mark" aria-hidden="true">FS</div>
        <p className="eyebrow">Frontend Sprint · 120 минут в день</p>
        <h1>Подготовка, которая живёт на твоих устройствах.</h1>
        <p className="login-lead">
          Интерфейс остаётся локальным. Компьютер и Android синхронизируют прогресс через
          один защищённый API и общую MongoDB.
        </p>
        <div className="login-features">
          <span><Smartphone size={18} /> Локальное Android-приложение</span>
          <span><Database size={18} /> Единый прогресс на устройствах</span>
          <span><LockKeyhole size={18} /> База недоступна клиентам напрямую</span>
        </div>
      </section>

      <section className="login-card" aria-labelledby="login-title">
        <div>
          <p className="eyebrow">Подключение</p>
          <h2 id="login-title">Войти в трекер</h2>
          <p>Укажи адрес своего API и личный пароль.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <TextInput
            type="url"
            label="Адрес API"
            value={apiUrl}
            onChange={(event) => setApiUrl(event.target.value)}
            placeholder="https://api.example.com/api"
            required
          />
          <PasswordInput
            label="Пароль"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            autoComplete="current-password"
            required
          />
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <Button
            className="primary-button"
            type="submit"
            loading={isPending}
            rightSection={<ArrowRight size={18} />}
          >
            Открыть план
          </Button>
        </form>
      </section>
    </main>
  );
}
