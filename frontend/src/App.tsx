import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginView } from './components/LoginView';
import { Navbar } from './components/Navbar';
import { KanbanBoard, QuadroFantasma } from './components/KanbanBoard';
import { BuscaRapida } from './components/BuscaRapida';
import { TabelaOrdens } from './components/TabelaOrdens';
import { DashboardView } from './components/DashboardView';
import { HistoricoView } from './components/HistoricoView';
import { ModalEntrada } from './components/ModalEntrada';
import { ModalDetalhes } from './components/ModalDetalhes';
import { ModalImportar } from './components/ModalImportar';
import { Toast, ToastMessage } from './components/Toast';
import {
  OrdemServico,
  DashboardMetricas,
  Origem,
  TipoServico,
  EtapaOrdemServico,
} from './types';
import { api } from './services/api';
import { useRota } from './utils/rota';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // Aba e OS aberta vêm do endereço (#tabela, #quadro/os/106)
  const { rota, irParaAba, abrirOs, fecharOs } = useRota();
  const abaAtiva = rota.aba;
  const ordemSelecionadaId = rota.osId;
  // Etapa escolhida no Painel: a Tabela abre já filtrada por ela
  const [etapaTabela, setEtapaTabela] = useState<EtapaOrdemServico | null>(null);
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [metricas, setMetricas] = useState<DashboardMetricas | null>(null);
  const [origens, setOrigens] = useState<Origem[]>([]);
  const [tiposServico, setTiposServico] = useState<TipoServico[]>([]);

  const [carregandoDados, setCarregandoDados] = useState<boolean>(false);
  // Incrementado a cada OS alterada, para o Histórico recarregar seus dados
  const [versaoDados, setVersaoDados] = useState(0);

  // Modais
  const [modalEntradaAberto, setModalEntradaAberto] = useState(false);
  const [placaEntrada, setPlacaEntrada] = useState<string | undefined>(undefined);
  const [modalImportarAberto, setModalImportarAberto] = useState(false);
  const [buscaAberta, setBuscaAberta] = useState(false);

  // Notificações Toast
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const proximoIdToast = useRef(0);

  const adicionarToast = (texto: string, tipo: 'sucesso' | 'erro' | 'info' = 'sucesso') => {
    // Contador: crypto.randomUUID só existe em contexto seguro (HTTPS/localhost), e o app
    // também é aberto por http no IP da rede (celular no pátio)
    proximoIdToast.current += 1;
    const id = String(proximoIdToast.current);
    setToasts((prev) => [...prev, { id, texto, tipo }]);
  };

  const removerToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const carregarDadosIniciais = useCallback(async () => {
    if (!isAuthenticated) return;
    setCarregandoDados(true);
    try {
      const [ordensRes, metricasRes, origensRes, tiposRes] = await Promise.all([
        api.listarOrdens({ ativo: true, ocultarEntreguesAnteriores: true }),
        api.obterMetricas(),
        api.listarOrigens(),
        api.listarTiposServico(),
      ]);

      setOrdens(ordensRes);
      setMetricas(metricasRes);
      setOrigens(origensRes);
      setTiposServico(tiposRes);
    } catch (err: any) {
      adicionarToast(err.message || 'Falha ao carregar dados do sistema.', 'erro');
    } finally {
      setCarregandoDados(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    carregarDadosIniciais();
  }, [carregarDadosIniciais]);

  // Ctrl+K (ou Cmd+K) abre a busca de placa de qualquer tela; "/" também, fora de campos de texto
  useEffect(() => {
    if (!isAuthenticated) return;
    const aoTeclar = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement;
      const digitando = alvo.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName);
      // Com outro diálogo aberto (detalhes, entrada), o atalho não empilha a busca por cima
      if (document.querySelector('[role="dialog"]')) return;
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !digitando)) {
        e.preventDefault();
        setBuscaAberta(true);
      }
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [isAuthenticated]);

  const abrirEntrada = (placa?: string) => {
    setPlacaEntrada(placa);
    setModalEntradaAberto(true);
  };

  const handleTransicionarEtapa = async (ordemId: number, novaEtapa: EtapaOrdemServico) => {
    try {
      const atualizada = await api.transicionarEtapa(ordemId, novaEtapa);
      setOrdens((prev) =>
        prev.map((o) => (o.id === ordemId ? atualizada : o))
      );
      // Recarregar métricas
      api.obterMetricas().then(setMetricas).catch(() => {});
      adicionarToast(`${atualizada.placa} movido para ${atualizada.etapaDescricao}.`);
    } catch (err: any) {
      adicionarToast(err.message || 'Erro ao transicionar etapa.', 'erro');
    }
  };

  const handleSucessoEntrada = (novaOrdem: OrdemServico) => {
    setModalEntradaAberto(false);
    setOrdens((prev) => [novaOrdem, ...prev]);
    api.obterMetricas().then(setMetricas).catch(() => {});
    adicionarToast(`Entrada de ${novaOrdem.placa} registrada.`);
  };

  const handleSucessoImportacao = () => {
    carregarDadosIniciais();
    adicionarToast('Planilha legada importada com sucesso!');
  };

  const handleOrdemAtualizada = (atualizada: OrdemServico) => {
    setOrdens((prev) =>
      prev.map((o) => (o.id === atualizada.id ? atualizada : o))
    );
    // A OS pode ter vindo do Histórico (ex.: reaberta) e agora pertencer à operação, ou o
    // contrário: recarrega a operação e avisa o Histórico para buscar de novo
    api.listarOrdens({ ativo: true, ocultarEntreguesAnteriores: true }).then(setOrdens).catch(() => {});
    setVersaoDados((v) => v + 1);
    api.obterMetricas().then(setMetricas).catch(() => {});
    adicionarToast(`Ordem de Serviço #${String(atualizada.id).padStart(5, '0')} atualizada.`);
  };

  const handleOrdemExcluida = (excluida: OrdemServico) => {
    fecharOs();
    // Só OS arquivada pode ser excluída, então basta o Histórico (Arquivadas) buscar de novo
    setVersaoDados((v) => v + 1);
    adicionarToast(`Ordem de Serviço #${String(excluida.id).padStart(5, '0')} (${excluida.placa}) excluída.`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen fundo-noite flex flex-col items-center justify-center text-noite-suave">
        <div className="w-10 h-10 border-2 border-acao border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Iniciando R-Fleet...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-parede text-grafite flex flex-col">
      {/* Barra de Navegação */}
      <Navbar
        abaAtiva={abaAtiva}
        setAbaAtiva={(aba) => {
          setEtapaTabela(null);
          irParaAba(aba);
        }}
        onAbrirNovaEntrada={() => abrirEntrada()}
        onAbrirImportar={() => setModalImportarAberto(true)}
        onAbrirBusca={() => setBuscaAberta(true)}
        metricas={metricas}
      />

      {/* Conteúdo Principal */}
      <main className={`flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-6 ${abaAtiva === 'kanban' ? '' : 'max-w-[1536px]'}`}>
        {carregandoDados && ordens.length === 0 && abaAtiva === 'kanban' ? (
          <QuadroFantasma />
        ) : carregandoDados && ordens.length === 0 ? (
          <div className="py-20 text-center text-aco">
            <div className="w-8 h-8 border-2 border-mercosul border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Sincronizando veículos e ordens de serviço...</p>
          </div>
        ) : (
          <>
            {abaAtiva === 'kanban' && (
              <KanbanBoard
                ordens={ordens}
                onSelecionarOrdem={(o) => abrirOs(o.id)}
                onTransicionarEtapa={handleTransicionarEtapa}
                onRegistrarEntrada={() => abrirEntrada()}
                onImportar={() => setModalImportarAberto(true)}
              />
            )}

            {abaAtiva === 'tabela' && (
              <TabelaOrdens
                key={etapaTabela ?? 'todas'}
                etapaInicial={etapaTabela ?? undefined}
                ordens={ordens}
                origens={origens}
                tiposServico={tiposServico}
                onSelecionarOrdem={(o) => abrirOs(o.id)}
                onTransicionarEtapa={handleTransicionarEtapa}
                onErro={(mensagem) => adicionarToast(mensagem, 'erro')}
              />
            )}

            {abaAtiva === 'dashboard' && (
              <DashboardView
                metricas={metricas}
                onFiltrarEtapa={(etapa) => {
                  setEtapaTabela(etapa);
                  irParaAba('tabela');
                }}
              />
            )}

            {abaAtiva === 'historico' && (
              <HistoricoView
                versaoDados={versaoDados}
                onSelecionarOrdem={(o) => abrirOs(o.id)}
                onErro={(mensagem) => adicionarToast(mensagem, 'erro')}
              />
            )}
          </>
        )}
      </main>

      {/* Modais Globais */}
      {modalEntradaAberto && (
        <ModalEntrada
          placaInicial={placaEntrada}
          origens={origens}
          tiposServico={tiposServico}
          onFechar={() => setModalEntradaAberto(false)}
          onSucesso={handleSucessoEntrada}
        />
      )}

      {modalImportarAberto && (
        <ModalImportar
          onFechar={() => setModalImportarAberto(false)}
          onSucesso={handleSucessoImportacao}
        />
      )}

      {ordemSelecionadaId !== null && (
        <ModalDetalhes
          key={ordemSelecionadaId}
          ordemId={ordemSelecionadaId}
          origens={origens}
          tiposServico={tiposServico}
          onFechar={fecharOs}
          onAtualizada={handleOrdemAtualizada}
          onExcluida={handleOrdemExcluida}
        />
      )}

      {buscaAberta && (
        <BuscaRapida
          ordens={ordens}
          onFechar={() => setBuscaAberta(false)}
          onAbrirOs={(id) => {
            setBuscaAberta(false);
            abrirOs(id);
          }}
          onRegistrarEntrada={(placa) => {
            setBuscaAberta(false);
            abrirEntrada(placa);
          }}
        />
      )}

      {/* Toasts de Feedback */}
      <Toast toasts={toasts} onDismiss={removerToast} />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
