package com.rfleet.web;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.time.ZonedDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class HealthController {

    private final DataSource dataSource;

    public HealthController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        boolean dbOk = false;
        try (Connection conn = dataSource.getConnection()) {
            dbOk = conn.isValid(2);
        } catch (Exception ignored) {
        }

        return ResponseEntity.ok(Map.of(
            "status", dbOk ? "UP" : "DEGRADED",
            "database", dbOk ? "CONNECTED" : "DISCONNECTED",
            "timestamp", ZonedDateTime.now().toString(),
            "service", "R-Fleet Backend API",
            "version", "1.0.0"
        ));
    }
}
