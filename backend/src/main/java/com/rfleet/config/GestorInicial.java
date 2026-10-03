package com.rfleet.config;

import com.rfleet.domain.Usuario;
import com.rfleet.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Configura a conta do gestor a partir de RFLEET_GESTOR_EMAIL / RFLEET_GESTOR_SENHA / RFLEET_GESTOR_NOME
 * e impede a aplicação de subir se nenhum gestor conseguir entrar. Nenhuma senha fica no código.
 */
@Component
public class GestorInicial implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(GestorInicial.class);
    private static final int TAMANHO_MINIMO_SENHA = 10;

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final String email;
    private final String senha;
    private final String nome;
    private final boolean exigirGestorValido;

    public GestorInicial(
            UsuarioRepository usuarioRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.gestor.email:}") String email,
            @Value("${app.gestor.senha:}") String senha,
            @Value("${app.gestor.nome:Gestor}") String nome,
            @Value("${app.gestor.exigir-gestor-valido:true}") boolean exigirGestorValido
    ) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.email = normalizar(email);
        this.senha = normalizar(senha);
        this.nome = normalizar(nome).isEmpty() ? "Gestor" : normalizar(nome);
        this.exigirGestorValido = exigirGestorValido;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        configurar();
    }

    @Transactional
    public void configurar() {
        boolean temEmail = !email.isEmpty();
        boolean temSenha = !senha.isEmpty();

        if (temEmail != temSenha) {
            throw new IllegalStateException("Defina RFLEET_GESTOR_EMAIL e RFLEET_GESTOR_SENHA juntos.");
        }

        if (temEmail) {
            if (senha.length() < TAMANHO_MINIMO_SENHA) {
                throw new IllegalStateException("RFLEET_GESTOR_SENHA deve ter pelo menos 10 caracteres.");
            }
            aplicarGestor();
        }

        if (exigirGestorValido && !usuarioRepository.existsByAtivoTrueAndSenhaHashNot(Usuario.SENHA_INVALIDADA)) {
            throw new IllegalStateException(
                    "Nenhum gestor consegue entrar no sistema. Defina RFLEET_GESTOR_EMAIL e RFLEET_GESTOR_SENHA (veja .env.example).");
        }
    }

    private void aplicarGestor() {
        Optional<Usuario> existente = usuarioRepository.findByEmailIgnoreCase(email);

        if (existente.isEmpty()) {
            usuarioRepository.save(Usuario.builder()
                    .nome(nome)
                    .email(email)
                    .senhaHash(passwordEncoder.encode(senha))
                    .ativo(true)
                    .build());
            log.info("Gestor {} criado.", email);
            return;
        }

        Usuario usuario = existente.get();
        if (Usuario.SENHA_INVALIDADA.equals(usuario.getSenhaHash())) {
            usuario.setSenhaHash(passwordEncoder.encode(senha));
            usuario.setAtivo(true);
            usuarioRepository.save(usuario);
            log.info("Senha do gestor {} definida.", usuario.getEmail());
        } else {
            log.info("Gestor {} já configurado; senha mantida.", usuario.getEmail());
        }
    }

    /** Remove espaços e aspas nas pontas (valores copiados para o .env costumam vir entre aspas). */
    private static String normalizar(String valor) {
        if (valor == null) {
            return "";
        }
        String v = valor.trim();
        if (v.length() >= 2 && (v.startsWith("\"") && v.endsWith("\"") || v.startsWith("'") && v.endsWith("'"))) {
            v = v.substring(1, v.length() - 1).trim();
        }
        return v;
    }
}
