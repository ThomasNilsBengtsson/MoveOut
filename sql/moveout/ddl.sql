-- Create tables for MoveOut
--


/* DROP TABLE IF EXISTS register;

CREATE TABLE register
(
    email VARCHAR(100) PRIMARY KEY NOT NULL,
    user_password VARCHAR(100)
); */
DROP TABLE IF EXISTS register;

CREATE TABLE register (
    email VARCHAR(100) PRIMARY KEY NOT NULL,
    user_password VARCHAR(150) NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_token VARCHAR(64),
    verification_token_expires DATETIME
);



--
--Procedures
--
DROP PROCEDURE IF EXISTS check_email_exists;
DELIMITER ;;

CREATE PROCEDURE check_email_exists(
    IN f_email VARCHAR(100),
    OUT email_exists BOOLEAN
)
BEGIN
    DECLARE count INT;
    SELECT COUNT(*) INTO count from register WHERE email = f_email;
    IF count > 0 THEN
        SET email_exists = TRUE;
    ELSE 
        SET email_exists = FALSE;
    END IF;
END ;;

DELIMITER ;


DROP PROCEDURE IF EXISTS user_register_data;
DELIMITER ;;

CREATE PROCEDURE user_register_data(
    f_email VARCHAR(100), 
    f_user_password VARCHAR(150),
    f_verification_token VARCHAR(64)
)
BEGIN
    INSERT INTO register(email, user_password, verification_token)
    VALUES(f_email, f_user_password, f_verification_token);
END;;

DELIMITER ;




/* DROP PROCEDURE IF EXISTS user_verification_by_token;
DELIMITER ;;

CREATE PROCEDURE user_verification_by_token(
    f_verification_token VARCHAR(64)
)
BEGIN 
    UPDATE register
    SET verified = TRUE,
        verification_token = NULL
    WHERE verification_token = f_verification_token
    AND verified = FALSE;
END;;

DELIMITER ;

 */

DROP PROCEDURE IF EXISTS user_verification_by_token;
DELIMITER ;;

CREATE PROCEDURE user_verification_by_token(
    f_verification_token VARCHAR(64)
)
BEGIN 
    UPDATE register
    SET verified = TRUE,
        verification_token = NULL
    WHERE verification_token = f_verification_token
    AND verified = FALSE;
END;;

DELIMITER ;



DROP PROCEDURE IF EXISTS retrieve_hashed_password;
DELIMITER ;;

CREATE PROCEDURE retrieve_hashed_password(
    IN f_email VARCHAR(100)
)
BEGIN
    SELECT user_password
    FROM register
    WHERE email = f_email;
END ;;
    
DELIMITER ;


DROP PROCEDURE IF EXISTS is_email_verified;
DELIMITER ;;

CREATE PROCEDURE is_email_verified(
    IN f_email VARCHAR(100)
)
BEGIN
    SELECT verified
    FROM register
    WHERE email = f_email;
END ;;

DELIMITER ;

