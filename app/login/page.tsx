"use client";

import { useState } from "react";
import { Box, Button, TextField, Typography, Container, Paper, CircularProgress, Alert } from "@mui/material";
import { useRouter } from "next/navigation";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

const API = process.env.NEXT_PUBLIC_API_URL || "https://assistant.arpasistemas.com.br";

export default function LoginPage() {
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, senha }),
      });

      if (!res.ok) {
        throw new Error("Credenciais inválidas");
      }

      const data = await res.json();
      if (data.status === "ok") {
        // Sucesso
        localStorage.setItem("isAuthenticated", "true");
        router.push("/dashboard");
      } else {
        setError(data.detail || "Erro ao fazer login");
      }
    } catch (err: any) {
      setError(err.message || "Erro de conexão");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      }}
    >
      <Container maxWidth="xs">
        <Paper
          elevation={12}
          sx={{
            p: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            borderRadius: 3,
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            backdropFilter: "blur(10px)",
            color: "#fff",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              backgroundColor: "primary.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 2,
              boxShadow: "0 0 15px rgba(25, 118, 210, 0.5)",
            }}
          >
            <LockOutlinedIcon sx={{ color: "#fff", fontSize: 28 }} />
          </Box>
          <Typography component="h1" variant="h5" sx={{ mb: 3, fontWeight: "bold" }}>
            Acesso ao Sistema
          </Typography>

          {error && (
            <Alert severity="error" sx={{ width: "100%", mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleLogin} sx={{ mt: 1, width: "100%" }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="login"
              label="Usuário / Email"
              name="login"
              autoComplete="email"
              autoFocus
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              InputLabelProps={{ style: { color: "#aaa" } }}
              InputProps={{
                style: { color: "#fff", backgroundColor: "rgba(0,0,0,0.2)" },
              }}
              sx={{
                mb: 2,
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "rgba(255,255,255,0.2)" },
                  "&:hover fieldset": { borderColor: "rgba(255,255,255,0.4)" },
                },
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="senha"
              label="Senha"
              type="password"
              id="senha"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              InputLabelProps={{ style: { color: "#aaa" } }}
              InputProps={{
                style: { color: "#fff", backgroundColor: "rgba(0,0,0,0.2)" },
              }}
              sx={{
                mb: 3,
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "rgba(255,255,255,0.2)" },
                  "&:hover fieldset": { borderColor: "rgba(255,255,255,0.4)" },
                },
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                py: 1.5,
                fontWeight: "bold",
                textTransform: "none",
                fontSize: "1rem",
                borderRadius: 2,
                backgroundColor: "primary.main",
                "&:hover": {
                  backgroundColor: "primary.dark",
                },
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : "Entrar"}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
