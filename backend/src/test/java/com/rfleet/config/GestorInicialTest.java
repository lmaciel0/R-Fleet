package com.rfleet.config;

import com.rfleet.domain.Usuario;
import com.rfleet.repository.UsuarioRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class GestorInicialTest {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private GestorInicial gestorInicial(String email, String senha, boolean exigir) {
        return new GestorInicial(usuarioRepository, passwordEncoder, email, senha, "Gestor da Oficina", exigir);
    }

    private static String emailAleatorio() {
        return "gestor." + UUID.randomUUID() + "@rfleet.local";
    }

    private static String senhaAleatoria() {
        return "Senha-" + UUID.randomUUID();
    }

    private Usuario salvar(String email, String senhaHash, boolean ativo) {
        return usuarioRepository.saveAndFlush(Usuario.builder()
                .nome("Existente")
                .email(email)
                .senhaHash(senhaHash)
                .ativo(ativo)
                .build());
    }

    @Test
    @DisplayName("Cria o gestor quando o e-mail ainda não existe")
    void criaGestorNovo() {
        String email = emailAleatorio();
        String senha = senhaAleatoria();

        gestorInicial(email, senha, true).configurar();

        Usuario criado = usuarioRepository.findByEmailIgnoreCase(email).orElseThrow();
        assertThat(criado.getAtivo()).isTrue();
        assertThat(criado.getNome()).isEqualTo("Gestor da Oficina");
        assertThat(passwordEncoder.matches(senha, criado.getSenhaHash())).isTrue();
    }

    @Test
    @DisplayName("Define a senha de uma conta revogada e a reativa, mesmo com o e-mail em outra capitalização")
    void redefineContaInvalidada() {
        String email = emailAleatorio();
        salvar(email, Usuario.SENHA_INVALIDADA, false);
        String senha = senhaAleatoria();

        gestorInicial(email.toUpperCase(), senha, true).configurar();

        assertThat(usuarioRepository.findAll().stream().filter(u -> u.getEmail().equalsIgnoreCase(email))).hasSize(1);
        Usuario conta = usuarioRepository.findByEmailIgnoreCase(email).orElseThrow();
        assertThat(conta.getAtivo()).isTrue();
        assertThat(passwordEncoder.matches(senha, conta.getSenhaHash())).isTrue();
    }

    @Test
    @DisplayName("Não sobrescreve a senha de um gestor que já tem senha válida")
    void mantemSenhaValida() {
        String email = emailAleatorio();
        String senhaAtual = senhaAleatoria();
        salvar(email, passwordEncoder.encode(senhaAtual), true);

        gestorInicial(email, senhaAleatoria(), true).configurar();

        Usuario conta = usuarioRepository.findByEmailIgnoreCase(email).orElseThrow();
        assertThat(passwordEncoder.matches(senhaAtual, conta.getSenhaHash())).isTrue();
    }

    @Test
    @DisplayName("Remove aspas nas pontas dos valores vindos do .env")
    void removeAspasDosValores() {
        String email = emailAleatorio();
        String senha = senhaAleatoria();

        gestorInicial("\"" + email + "\"", "'" + senha + "'", true).configurar();

        Usuario criado = usuarioRepository.findByEmailIgnoreCase(email).orElseThrow();
        assertThat(passwordEncoder.matches(senha, criado.getSenhaHash())).isTrue();
    }

    @Test
    @DisplayName("Rejeita senha com menos de 10 caracteres")
    void rejeitaSenhaCurta() {
        assertThatThrownBy(() -> gestorInicial(emailAleatorio(), "123456789", true).configurar())
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("RFLEET_GESTOR_SENHA deve ter pelo menos 10 caracteres.");
    }

    @Test
    @DisplayName("Exige e-mail e senha juntos")
    void exigeEmailESenhaJuntos() {
        assertThatThrownBy(() -> gestorInicial(emailAleatorio(), "", true).configurar())
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Defina RFLEET_GESTOR_EMAIL e RFLEET_GESTOR_SENHA juntos.");
    }

    @Test
    @DisplayName("Não sobe quando nenhum gestor consegue entrar e as variáveis faltam")
    void falhaSemGestorValido() {
        usuarioRepository.findAll().forEach(u -> u.setSenhaHash(Usuario.SENHA_INVALIDADA));
        usuarioRepository.flush();

        assertThatThrownBy(() -> gestorInicial("", "", true).configurar())
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Nenhum gestor consegue entrar no sistema. Defina RFLEET_GESTOR_EMAIL e RFLEET_GESTOR_SENHA (veja .env.example).");
    }

    @Test
    @DisplayName("Sobe normalmente sem variáveis quando já existe gestor válido")
    void sobeComGestorValidoExistente() {
        salvar(emailAleatorio(), passwordEncoder.encode(senhaAleatoria()), true);

        assertThatCode(() -> gestorInicial("", "", true).configurar()).doesNotThrowAnyException();
    }
}
