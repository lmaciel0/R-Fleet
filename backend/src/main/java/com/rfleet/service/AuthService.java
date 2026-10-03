package com.rfleet.service;

import com.rfleet.domain.Usuario;
import com.rfleet.dto.LoginRequest;
import com.rfleet.dto.LoginResponse;
import com.rfleet.dto.UsuarioResponse;
import com.rfleet.repository.UsuarioRepository;
import com.rfleet.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UsuarioRepository usuarioRepository;
    private final JwtService jwtService;

    public AuthService(
            AuthenticationManager authenticationManager,
            UsuarioRepository usuarioRepository,
            JwtService jwtService
    ) {
        this.authenticationManager = authenticationManager;
        this.usuarioRepository = usuarioRepository;
        this.jwtService = jwtService;
    }

    public LoginResponse login(LoginRequest request) {
        final String email = request.getEmail().trim().toLowerCase();

        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, request.getSenha())
        );

        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BadCredentialsException("E-mail ou senha inválidos"));

        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("userId", usuario.getId().toString());
        extraClaims.put("nome", usuario.getNome());

        String token = jwtService.generateToken(usuario.getEmail(), extraClaims);

        return LoginResponse.builder()
                .token(token)
                .tipo("Bearer")
                .usuario(UsuarioResponse.fromEntity(usuario))
                .build();
    }

    public UsuarioResponse obterUsuarioAutenticado(String email) {
        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BadCredentialsException("Usuário autenticado não encontrado"));

        return UsuarioResponse.fromEntity(usuario);
    }
}
