package com.rfleet;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class RfleetApplicationTests {

    @Test
    void contextLoads() {
        // Validação de inicialização da classe principal
        RfleetApplication app = new RfleetApplication();
        assertNotNull(app);
    }
}
