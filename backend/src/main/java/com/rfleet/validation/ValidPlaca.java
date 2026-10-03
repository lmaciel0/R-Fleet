package com.rfleet.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

@Documented
@Constraint(validatedBy = PlacaValidator.class)
@Target({ElementType.METHOD, ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidPlaca {

    String message() default "Placa inválida. Utilize o formato tradicional (ABC-1234) ou Mercosul (ABC1D23).";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
