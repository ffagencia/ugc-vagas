import React, { useState, useMemo, useEffect } from "react";
import netlifyIdentity from "netlify-identity-widget";
import {
  Search, MapPin, Clock, Users, Zap, X, Check, ChevronRight,
  AtSign, Link2, Banknote, ArrowLeft, Lock, Crown
} from "lucide-react";

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap');

@media (max-width: 720px) {
  .ugc-main-grid { grid-template-columns: 1fr !important; }
  .ugc-vaga-card { flex-wrap: wrap !important; }
  .ugc-price-block { text-align: left !important; margin-top: 4px; padding-left: 20px; }
  .ugc-stats-strip { gap: 16px !important; flex-wrap: wrap !important; }
  .ugc-header-row { gap: 12px !important; }
}
`;

const CATS = [
  { id: "beleza", label: "Beleza", color: "#D4537E", bg: "#FBEAF0" },
  { id: "eletronicos", label: "Eletrônicos", color: "#185FA5", bg: "#E6F1FB" },
  { id: "alimentacao", label: "Alimentação", color: "#3B6D11", bg: "#EAF3DE" },
  { id: "moda", label: "Moda", color: "#993556", bg: "#FBEAF0" },
  { id: "fitness", label: "Fitness", color: "#854F0B", bg: "#FAEEDA" },
  { id: "pet", label: "Pet", color: "#0F6E56", bg: "#E1F5EE" },
  { id: "casa", label: "Casa", color: "#712B13", bg: "#FAECE7" },
  { id: "tech", label: "App / Tech", color: "#3C3489", bg: "#EEEDFE" },
];

const FORMATOS = ["Vídeo TikTok", "Vídeo Reels", "Foto + Legenda", "Review em vídeo", "Unboxing"];

const VAGAS = [
  { id: 1, marca: "Lemon Fresh", titulo: "Indicação loja Apple", catId: "eletronicos", formato: "TikTok, Reels e Unboxing", pagamentoLabel: "R$800 ou Apple Watch seminovo", prazo: "7 dias", local: "Remoto", candidatos: 6, urgente: true, black: true,
    descricao: "Buscamos criador para produzir conteúdo de review de um iPhone novo ou Apple Watch, mostrando o produto em uso real e indicando a loja de compra.",
    requisitos: ["Gravar de 6 a 8 vídeos ao todo (TikTok, Reels e Unboxing)", "Focar em review honesto do iPhone ou Apple Watch", "Citar e indicar a loja Lemon Fresh no conteúdo", "Entrega de todos os vídeos em até 7 dias após receber o produto"] },
];

// Referência para o contador de "marcas parceiras" que cresce sozinho a cada 30 minutos
const PARCEIRAS_BASE = 212;
const PARCEIRAS_REFERENCIA = new Date("2026-07-04T00:00:00").getTime();
const PARCEIRAS_INTERVALO_MS = 30 * 60 * 1000;

const catInfo = (id) => CATS.find((c) => c.id === id);

// Cole aqui a URL gerada ao publicar o Google Apps Script como Web App (passo a passo enviado separadamente)
const SHEET_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbx_ZDz4cdlVmo-Xkq3V1ot9dkkh5_Qvap-8SWilLDC_gLmTiIcHDn7SOscizDA-sFzl/exec";

// Cole aqui o link de checkout da assinatura na Kiwify
const CHECKOUT_URL = "https://pay.kiwify.com.br/05L4CQS";

// Placeholder - trocar quando o checkout do plano Black estiver pronto na Kiwify
const CHECKOUT_URL_BLACK = "COLE_AQUI_O_LINK_DO_CHECKOUT_BLACK";

export default function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    netlifyIdentity.init();
    netlifyIdentity.on("login", (u) => { setUser(u); netlifyIdentity.close(); });
    netlifyIdentity.on("logout", () => setUser(null));
    setUser(netlifyIdentity.currentUser());
    setAuthReady(true);
    return () => {
      netlifyIdentity.off("login");
      netlifyIdentity.off("logout");
    };
  }, []);

  const isAssinante = !!user?.app_metadata?.roles?.includes("assinante");
  const isAssinanteBlack = !!user?.app_metadata?.roles?.includes("assinante_black");

  const calcularParceiras = () =>
    PARCEIRAS_BASE + Math.max(0, Math.floor((Date.now() - PARCEIRAS_REFERENCIA) / PARCEIRAS_INTERVALO_MS));

  const [marcasParceiras, setMarcasParceiras] = useState(calcularParceiras);

  useEffect(() => {
    const id = setInterval(() => setMarcasParceiras(calcularParceiras()), 60 * 1000);
    return () => clearInterval(id);
  }, []);


  const goToCheckout = () => {
    const emailParam = user?.email ? `?email=${encodeURIComponent(user.email)}` : "";
    window.location.href = CHECKOUT_URL + emailParam;
  };

  const goToCheckoutBlack = () => {
    const emailParam = user?.email ? `?email=${encodeURIComponent(user.email)}` : "";
    window.location.href = CHECKOUT_URL_BLACK + emailParam;
  };

  const [mode, setMode] = useState("criador");
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState([]);
  const [blackOnly, setBlackOnly] = useState(false);
  const [selectedVaga, setSelectedVaga] = useState(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyForm, setApplyForm] = useState({ nome: "", rede: "", link: "" });
  const [appliedIds, setAppliedIds] = useState([]);
  const [applySuccess, setApplySuccess] = useState(false);

  const accent = mode === "criador" ? "#D4537E" : "#534AB7";
  const accentBg = mode === "criador" ? "#FBEAF0" : "#EEEDFE";
  const accentDark = mode === "criador" ? "#4B1528" : "#26215C";

  const filteredVagas = useMemo(() => {
    return VAGAS.filter((v) => {
      const matchQuery = (v.titulo + v.marca).toLowerCase().includes(query.toLowerCase());
      const matchCat = catFilter.length === 0 || catFilter.includes(v.catId);
      const matchBlack = !blackOnly || v.black;
      return matchQuery && matchCat && matchBlack;
    });
  }, [query, catFilter, blackOnly]);

  const toggleCat = (id) => {
    setCatFilter((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  };

  const openApply = (vaga) => {
    setSelectedVaga(vaga);
    setApplyOpen(true);
    setApplySuccess(false);
    setApplyForm({ nome: "", rede: "", link: "" });
  };

  const submitApply = () => {
    if (!applyForm.nome || !applyForm.rede) return;

    if (SHEET_WEBHOOK_URL && SHEET_WEBHOOK_URL !== "COLE_AQUI_A_URL_DO_APPS_SCRIPT") {
      fetch(SHEET_WEBHOOK_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          data: new Date().toLocaleString("pt-BR"),
          vaga: selectedVaga.titulo,
          marca: selectedVaga.marca,
          nome: applyForm.nome,
          rede: applyForm.rede,
          link: applyForm.link,
        }),
      }).catch(() => {});
    }

    setAppliedIds((prev) => [...prev, selectedVaga.id]);
    setApplySuccess(true);
  };

  if (!authReady) {
    return <div style={{ minHeight: "100vh", background: "#F5F2FF" }} />;
  }

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", background: "#F5F2FF", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif" }}>
        <style>{FONTS}</style>
        <div style={{ textAlign: "center", padding: 32 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 2, fontFamily: "'Space Grotesk', sans-serif", justifyContent: "center", marginBottom: 20 }}>
            <span style={{ fontWeight: 700, fontSize: 28 }}>UGC</span>
            <span style={{ fontWeight: 500, fontSize: 28, color: "#D4537E" }}>Club</span>
          </div>
          <p style={{ color: "#8A82AE", fontSize: 14, marginBottom: 20 }}>Crie sua conta grátis para ver as vagas disponíveis.</p>
          <button
            onClick={() => netlifyIdentity.open("login")}
            style={{ background: "#D4537E", color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
          >
            Entrar ou criar conta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#F5F2FF", minHeight: "100vh", color: "#1D1633" }}>
      <style>{FONTS}</style>

      {/* HEADER */}
      <header style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(245,242,255,0.92)", backdropFilter: "blur(6px)", borderBottom: "1px solid #E1DCF5" }}>
        <div className="ugc-header-row" style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 20px", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 2, fontFamily: "'Space Grotesk', sans-serif" }}>
            <span style={{ fontWeight: 700, fontSize: 22 }}>UGC</span>
            <span style={{ fontWeight: 500, fontSize: 22, color: accent, transition: "color .25s" }}>Club</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", flex: "1 1 260px", minWidth: 200, background: "#fff", border: "1px solid #E1DCF5", borderRadius: 10, padding: "8px 12px", gap: 8 }}>
            <Search size={16} color="#8A82AE" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar vaga ou marca..."
              style={{ border: "none", outline: "none", fontSize: 14, flex: 1, background: "transparent", fontFamily: "'Inter', sans-serif" }}
            />
          </div>

          <div style={{ display: "flex", background: "#fff", borderRadius: 999, border: "1px solid #E1DCF5", padding: 3 }}>
            {["criador", "marca"].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  border: "none", cursor: "pointer", padding: "8px 16px", borderRadius: 999,
                  fontSize: 13, fontWeight: 600, fontFamily: "'Inter', sans-serif",
                  background: mode === m ? accent : "transparent",
                  color: mode === m ? "#fff" : "#5F5A78",
                  transition: "all .2s",
                }}
              >
                {m === "criador" ? "Sou criador" : "Sou marca"}
              </button>
            ))}
          </div>

          <button
            onClick={() => netlifyIdentity.logout()}
            style={{ border: "1px solid #E1DCF5", background: "#fff", color: "#8A82AE", borderRadius: 999, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
          >
            Sair
          </button>
        </div>

        {/* STATS STRIP */}
        <div className="ugc-stats-strip" style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px 14px", display: "flex", gap: 28, fontFamily: "'JetBrains Mono', monospace" }}>
          {[
            ["128", "vagas ativas"],
            ["3.4k", "criadores cadastrados"],
            [marcasParceiras, "marcas parceiras"],
          ].map(([num, label], i) => (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: accentDark }}>{num}</span>
              <span style={{ fontSize: 11, color: "#8A82AE", fontFamily: "'Inter', sans-serif" }}>{label}</span>
            </div>
          ))}
        </div>
      </header>

      {mode === "criador" ? (
        <main style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px 80px" }}>
          {/* CATEGORY CHIPS */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            <CategoryChip active={catFilter.length === 0} onClick={() => setCatFilter([])} color="#5F5A78" label="Todas" />
            {CATS.map((c) => (
              <CategoryChip key={c.id} active={catFilter.includes(c.id)} onClick={() => toggleCat(c.id)} color={c.color} label={c.label} />
            ))}
            <button
              onClick={() => isAssinanteBlack ? setBlackOnly((b) => !b) : goToCheckoutBlack()}
              style={{
                display: "flex", alignItems: "center", gap: 6, border: blackOnly ? "none" : "1px solid #2A2A2A",
                background: blackOnly ? "#111111" : "#1A1A1A", color: "#F0C674",
                borderRadius: 999, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap",
              }}
            >
              <Crown size={13} /> Black {!isAssinanteBlack && <Lock size={11} />}
            </button>
          </div>

          {/* VAGA LIST */}
          <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {!isAssinante && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "#fff", border: "1px solid #F0D9E2", borderRadius: 12, padding: "12px 16px", flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, color: "#3A3355" }}>🔒 Assine para ver detalhes e se candidatar às vagas</span>
                <button onClick={goToCheckout} style={{ background: "#D4537E", color: "#fff", border: "none", borderRadius: 999, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap" }}>
                  Assinar agora
                </button>
              </div>
            )}
            <p style={{ fontSize: 13, color: "#8A82AE", margin: 0 }}>{filteredVagas.length} vagas encontradas</p>
            {filteredVagas.map((v) => {
              const cat = catInfo(v.catId);
              const applied = appliedIds.includes(v.id);
              return (
                <div key={v.id} onClick={() => {
                  if (v.black && !isAssinanteBlack) return goToCheckoutBlack();
                  if (!isAssinante) return goToCheckout();
                  setSelectedVaga(v);
                }} className="ugc-vaga-card" style={{
                  display: "flex", background: "#fff", border: v.black ? "1px solid #E8D293" : "1px solid #E7E2F5", borderRadius: 14,
                  padding: "16px 18px", cursor: "pointer", gap: 14, alignItems: "center", transition: "border-color .15s",
                }}>
                  <div style={{ width: 6, alignSelf: "stretch", borderRadius: 4, background: v.black ? "#111111" : cat.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: cat.bg, color: cat.color }}>{cat.label}</span>
                      {v.black && (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: "#111111", color: "#F0C674", display: "flex", alignItems: "center", gap: 3 }}>
                          <Crown size={10} /> Black
                        </span>
                      )}
                      {v.urgente && (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: "#FAEEDA", color: "#854F0B", display: "flex", alignItems: "center", gap: 3 }}>
                          <Zap size={10} /> Urgente
                        </span>
                      )}
                    </div>
                    <h3 style={{ margin: "0 0 2px", fontSize: 15, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}>{v.titulo}</h3>
                    <p style={{ margin: 0, fontSize: 13, color: "#8A82AE" }}>{v.marca}</p>
                    <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 12, color: "#8A82AE", flexWrap: "wrap" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={12} />{v.prazo}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={12} />{v.local}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Users size={12} />{v.candidatos} candidatos</span>
                    </div>
                  </div>
                  <div className="ugc-price-block" style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 15, color: v.black ? "#8A6D1F" : accentDark, maxWidth: 130, display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                      {v.black && !isAssinanteBlack ? <><Lock size={12} /> ***</> : (v.pagamentoLabel || `R$${v.pagamento}`)}
                    </div>
                    <div style={{ fontSize: 11, color: applied ? "#3B6D11" : "#8A82AE", marginTop: 4 }}>{applied ? "Candidatura enviada" : "por entrega"}</div>
                  </div>
                  <ChevronRight size={18} color="#C4BCE0" />
                </div>
              );
            })}
            {filteredVagas.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#8A82AE", fontSize: 14 }}>Nenhuma vaga encontrada com esses filtros.</div>
            )}
          </section>
        </main>
      ) : (
        <main style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px 80px" }}>
          <div style={{ background: "#fff", border: "1px solid #E7E2F5", borderRadius: 16, padding: "48px 32px", textAlign: "center", maxWidth: 480, margin: "40px auto 0" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#EEEDFE", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
              <Lock size={22} color="#534AB7" />
            </div>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 19, margin: "0 0 8px", fontWeight: 500 }}>Em breve para marcas</h2>
            <p style={{ fontSize: 14, color: "#8A82AE", margin: 0, lineHeight: 1.6 }}>
              A função de postar vagas está temporariamente indisponível enquanto finalizamos o processo para marcas parceiras.
            </p>
          </div>
        </main>
      )}

      {/* DETAIL DRAWER */}
      {selectedVaga && !applyOpen && (
        <Overlay onClose={() => setSelectedVaga(null)}>
          <div style={{ padding: 24 }}>
            <button onClick={() => setSelectedVaga(null)} style={ghostBtn}><ArrowLeft size={14} /> Voltar</button>
            {(() => {
              const cat = catInfo(selectedVaga.catId);
              const applied = appliedIds.includes(selectedVaga.id);
              return (
                <>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 6, background: cat.bg, color: cat.color }}>{cat.label}</span>
                  <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 21, margin: "12px 0 2px", fontWeight: 500 }}>{selectedVaga.titulo}</h2>
                  <p style={{ margin: "0 0 16px", color: "#8A82AE", fontSize: 14 }}>{selectedVaga.marca}</p>

                  <div style={{ display: "flex", gap: 18, marginBottom: 18, fontSize: 13, color: "#5F5A78", flexWrap: "wrap" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={13} />{selectedVaga.prazo}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={13} />{selectedVaga.local}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Users size={13} />{selectedVaga.candidatos} candidatos</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: "#4B1528" }}>
                      <Banknote size={13} />{selectedVaga.black && !isAssinanteBlack ? "***" : (selectedVaga.pagamentoLabel || `R$${selectedVaga.pagamento}`)}
                    </span>
                  </div>

                  <p style={{ fontSize: 14, lineHeight: 1.6, color: "#3A3355", marginBottom: 18 }}>{selectedVaga.descricao}</p>

                  <p style={{ fontSize: 12, fontWeight: 600, color: "#8A82AE", textTransform: "uppercase", letterSpacing: 0.4, margin: "0 0 8px" }}>Requisitos</p>
                  <ul style={{ margin: "0 0 22px", paddingLeft: 18, fontSize: 13, color: "#3A3355", lineHeight: 1.8 }}>
                    {selectedVaga.requisitos.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>

                  <button
                    disabled={applied}
                    onClick={() => {
                      if (selectedVaga.black && !isAssinanteBlack) return goToCheckoutBlack();
                      if (!isAssinante) return goToCheckout();
                      openApply(selectedVaga);
                    }}
                    style={{
                      width: "100%", border: "none", borderRadius: 10, padding: "13px", fontWeight: 600, fontSize: 14,
                      cursor: applied ? "default" : "pointer", fontFamily: "'Inter', sans-serif",
                      background: applied ? "#EAF3DE" : "#D4537E", color: applied ? "#3B6D11" : "#fff",
                    }}
                  >
                    {applied ? "Candidatura enviada" : "Candidatar-se"}
                  </button>
                </>
              );
            })()}
          </div>
        </Overlay>
      )}

      {/* APPLY MODAL */}
      {applyOpen && selectedVaga && (
        <Overlay onClose={() => { setApplyOpen(false); setSelectedVaga(null); }}>
          <div style={{ padding: 24 }}>
            {!applySuccess ? (
              <>
                <button onClick={() => setApplyOpen(false)} style={ghostBtn}><ArrowLeft size={14} /> Voltar</button>
                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 19, margin: "12px 0 4px", fontWeight: 500 }}>Candidatar-se</h2>
                <p style={{ fontSize: 13, color: "#8A82AE", margin: "0 0 20px" }}>{selectedVaga.titulo} · {selectedVaga.marca}</p>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <FieldLabel label="Seu nome">
                    <input value={applyForm.nome} onChange={(e) => setApplyForm({ ...applyForm, nome: e.target.value })} placeholder="Nome completo" style={inputStyle} />
                  </FieldLabel>
                  <FieldLabel label="Instagram ou TikTok">
                    <div style={{ position: "relative" }}>
                      <AtSign size={14} style={{ position: "absolute", left: 10, top: 11, color: "#8A82AE" }} />
                      <input value={applyForm.rede} onChange={(e) => setApplyForm({ ...applyForm, rede: e.target.value })} placeholder="@seuusuario" style={{ ...inputStyle, paddingLeft: 30 }} />
                    </div>
                  </FieldLabel>
                  <FieldLabel label="Link de portfólio (opcional)">
                    <div style={{ position: "relative" }}>
                      <Link2 size={14} style={{ position: "absolute", left: 10, top: 11, color: "#8A82AE" }} />
                      <input value={applyForm.link} onChange={(e) => setApplyForm({ ...applyForm, link: e.target.value })} placeholder="https://" style={{ ...inputStyle, paddingLeft: 30 }} />
                    </div>
                  </FieldLabel>
                  <button onClick={submitApply} style={{ marginTop: 6, background: "#D4537E", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                    Enviar candidatura
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "30px 10px" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#EAF3DE", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <Check size={22} color="#3B6D11" />
                </div>
                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, margin: "0 0 6px", fontWeight: 500 }}>Candidatura enviada</h2>
                <p style={{ fontSize: 13, color: "#8A82AE", margin: "0 0 20px" }}>{selectedVaga.marca} entra em contato em até 3 dias úteis.</p>
                <button onClick={() => { setApplyOpen(false); setSelectedVaga(null); }} style={{ background: "#F5F2FF", border: "1px solid #E1DCF5", borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                  Voltar às vagas
                </button>
              </div>
            )}
          </div>
        </Overlay>
      )}
    </div>
  );
}

function Overlay({ children, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(29,22,51,0.35)", display: "flex", justifyContent: "flex-end", zIndex: 50 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 420, maxWidth: "92vw", background: "#fff", height: "100%", overflowY: "auto", boxShadow: "-4px 0 24px rgba(29,22,51,0.12)" }}>
        {children}
      </div>
    </div>
  );
}

function CategoryChip({ active, onClick, color, label }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 7, border: active ? "none" : "1px solid #E1DCF5",
      background: active ? color : "#fff", color: active ? "#fff" : "#3A3355",
      borderRadius: 999, padding: "7px 14px", cursor: "pointer",
      fontSize: 13, fontWeight: 600, fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap",
      transition: "all .15s",
    }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: active ? "#fff" : color, flexShrink: 0 }} />
      {label}
      {active && <Check size={12} strokeWidth={3} />}
    </button>
  );
}

function FieldLabel({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
      <span style={{ fontSize: 12, color: "#8A82AE", fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle = {
  border: "1px solid #E1DCF5", borderRadius: 8, padding: "10px 10px", fontSize: 14,
  fontFamily: "'Inter', sans-serif", outline: "none", width: "100%", boxSizing: "border-box",
};

const ghostBtn = {
  display: "flex", alignItems: "center", gap: 6, border: "none", background: "transparent",
  color: "#8A82AE", fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 10, fontFamily: "'Inter', sans-serif",
};