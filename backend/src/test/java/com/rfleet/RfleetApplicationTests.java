package com.rfleet;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import javax.sql.DataSource;
import java.sql.Connection;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class RfleetApplicationTests {

    @Autowired
    private DataSource dataSource;

    @Test
    void contextLoadsAndDatabaseMigrates() throws Exception {
        assertNotNull(dataSource);
        try (Connection conn = dataSource.getConnection()) {
            assertTrue(conn.isValid(2), "Conexão com PostgreSQL deve estar ativa e válida");
        }
    }
}
