package com.instana.robotshop.shipping;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import javax.sql.DataSource;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;

@Configuration
public class JpaConfig {
    private static final Logger logger = LoggerFactory.getLogger(JpaConfig.class);

    @Bean
    public DataSource getDataSource() {
        String JDBC_URL = String.format("jdbc:mysql://%s/cities?useSSL=false&autoReconnect=true", System.getenv("DB_HOST") == null ? "mysql" : System.getenv("DB_HOST"));

        logger.info("jdbc url {}", JDBC_URL);

        String dbUser = System.getenv("DB_USER") == null ? "" : System.getenv("DB_USER");
        String dbPassword = System.getenv("DB_PASSWORD") == null ? "" : System.getenv("DB_PASSWORD");

        bob.driverClassName("com.mysql.jdbc.Driver");
        bob.url(JDBC_URL);
        bob.username(dbUser);
        bob.password(dbPassword);

        return bob.build();
    }
}
