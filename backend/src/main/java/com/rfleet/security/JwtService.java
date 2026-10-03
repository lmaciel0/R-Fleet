package com.rfleet.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.Map;
import java.util.function.Function;

@Service
public class JwtService {

    private static final int TAMANHO_MINIMO_CHAVE_BYTES = 32;

    private final SecretKey chaveAssinatura;
    private final long jwtExpirationMs;

    public JwtService(
            @Value("${app.jwt.secret:}") String secretKey,
            @Value("${app.jwt.expiration-ms}") long jwtExpirationMs
    ) {
        this.chaveAssinatura = criarChave(secretKey);
        this.jwtExpirationMs = jwtExpirationMs;
    }

    private static SecretKey criarChave(String secretKey) {
        byte[] bytes;
        try {
            // Ignora espaços e quebras de linha: o openssl gera a chave em duas linhas (\r\n no Windows)
            bytes = secretKey == null || secretKey.isBlank()
                    ? new byte[0]
                    : Decoders.BASE64.decode(secretKey.replaceAll("\\s", ""));
        } catch (RuntimeException e) {
            bytes = new byte[0];
        }
        if (bytes.length < TAMANHO_MINIMO_CHAVE_BYTES) {
            throw new IllegalStateException("JWT_SECRET ausente ou fraco: gere com \"openssl rand -base64 64\" (veja .env.example).");
        }
        return Keys.hmacShaKeyFor(bytes);
    }

    public String generateToken(String email, Map<String, Object> extraClaims) {
        return Jwts.builder()
                .claims(extraClaims)
                .subject(email)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + jwtExpirationMs))
                .signWith(getSignInKey())
                .compact();
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return (username.equalsIgnoreCase(userDetails.getUsername())) && !isTokenExpired(token);
    }

    public boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    private Claims extractAllClaims(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(getSignInKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (JwtException | IllegalArgumentException e) {
            throw new IllegalArgumentException("Token JWT inválido ou expirado", e);
        }
    }

    private SecretKey getSignInKey() {
        return chaveAssinatura;
    }
}
