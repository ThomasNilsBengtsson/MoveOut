-- Create tables for MoveOut
--


DROP TABLE IF EXISTS qr_code_labels;
DROP TABLE IF EXISTS register;

CREATE TABLE register (
    email VARCHAR(100) PRIMARY KEY NOT NULL,
    user_password VARCHAR(150) NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_token VARCHAR(64),
    verification_token_expires DATETIME
);



CREATE TABLE qr_code_labels (
    label_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100),
    text_content TEXT,
    image_path VARCHAR(255),
    audio_path VARCHAR(255),
    content_type ENUM('text', 'image', 'audio'),
    verification_code VARCHAR(6), 
    is_user_verified BOOLEAN DEFAULT FALSE,
    is_label_private BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (email) REFERENCES register(email)
);



--
--Procedures
--



DROP PROCEDURE IF EXISTS unverify_user_code_label;
DELIMITER ;;

CREATE PROCEDURE unverify_user_code_label(
    IN f_label_id INT
)
BEGIN
    UPDATE qr_code_labels
    SET is_user_verified = FALSE
    WHERE label_id = f_label_id;
END;;

DELIMITER ;


DROP PROCEDURE IF EXISTS user_verified_label_code;
DELIMITER ;;

CREATE PROCEDURE user_verified_label_code(
    IN f_label_id INT
)
BEGIN
    UPDATE qr_code_labels
    SET is_user_verified = TRUE
    WHERE label_id = f_label_id;
END;;

DELIMITER ;



DROP PROCEDURE IF EXISTS validate_verification_code_label;
DELIMITER ;;

CREATE PROCEDURE validate_verification_code_label(
    IN f_label_id INT,
    IN f_verification_code VARCHAR(6)
)
BEGIN
    SELECT COUNT(*) AS result
    FROM qr_code_labels
    WHERE label_id = f_label_id AND verification_code = f_verification_code;
END;;

DELIMITER ;





DROP PROCEDURE IF EXISTS insert_label_verification_code;
DELIMITER ;;

CREATE PROCEDURE insert_label_verification_code(
    IN f_label_id INT,
    IN f_verification_code VARCHAR(6)
)
BEGIN
    UPDATE qr_code_labels
    SET verification_code = f_verification_code
    WHERE label_id = f_label_id;
END ;;

DELIMITER ;




DROP PROCEDURE IF EXISTS insert_to_qr_code;
DELIMITER ;;

CREATE PROCEDURE insert_to_qr_code(
    IN f_email VARCHAR(100),
    IN f_text_content TEXT,
    IN f_image_path VARCHAR(255),
    IN f_audio_path VARCHAR(255),
    IN f_is_label_private TINYINT
)
BEGIN
    DECLARE v_content_type ENUM('text', 'image', 'audio');

    IF NOT EXISTS (SELECT 1 FROM register WHERE email = f_email) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Email not registered.';
    END IF;

    IF f_text_content IS NOT NULL AND f_text_content != '' THEN
        SET v_content_type = 'text';
    ELSEIF f_image_path IS NOT NULL AND f_image_path != '' THEN
        SET v_content_type = 'image';
    ELSEIF f_audio_path IS NOT NULL AND f_audio_path != '' THEN
        SET v_content_type = 'audio';
    ELSE
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No content provided.';
    END IF;

    INSERT INTO qr_code_labels (email, text_content, image_path, audio_path, content_type, is_label_private)
    VALUES (f_email, f_text_content, f_image_path, f_audio_path, v_content_type, f_is_label_private);

    SELECT LAST_INSERT_ID() AS label_id;
END;;

DELIMITER ;
 



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

