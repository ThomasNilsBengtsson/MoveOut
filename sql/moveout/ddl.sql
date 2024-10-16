-- Create tables for MoveOut
--

DROP TABLE IF EXISTS shared_labels;
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
    label_name VARCHAR(20),
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

ALTER TABLE qr_code_labels
MODIFY audio_path JSON;

ALTER TABLE qr_code_labels
MODIFY image_path JSON;

ALTER TABLE qr_code_labels ADD CONSTRAINT unique_label_name UNIQUE (label_name);



CREATE TABLE shared_labels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    original_label_id INT NOT NULL, -- Refers to the original label shared by the sender
    sender_email VARCHAR(100) NOT NULL,
    recipient_email VARCHAR(100) NOT NULL,
    shared_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (original_label_id) REFERENCES qr_code_labels(label_id),
    FOREIGN KEY (sender_email) REFERENCES register(email),
    FOREIGN KEY (recipient_email) REFERENCES register(email)
);

--
--Procedures
--


DROP PROCEDURE IF EXISTS check_if_label_name_exists;
DELIMITER ;;

CREATE PROCEDURE check_if_label_name_exists(
    IN f_label_name VARCHAR(15),
    IN f_email VARCHAR(100)
)
BEGIN
    SELECT COUNT(*) AS label_count 
    FROM qr_code_labels
    WHERE label_name = f_label_name AND email = f_email;
END;;

DELIMITER ;




DROP PROCEDURE IF EXISTS get_shared_label_details;
DELIMITER ;;

CREATE PROCEDURE get_shared_label_details(
    IN f_shared_id INT
)
BEGIN
    SELECT 
        l.label_id, 
        l.text_content, 
        l.image_path, 
        l.audio_path, 
        l.content_type, 
        l.is_label_private, 
        s.sender_email, 
        s.recipient_email, 
        s.shared_date
    FROM 
        shared_labels s
    INNER JOIN 
        qr_code_labels l ON l.label_id = s.original_label_id
    WHERE 
        s.id = f_shared_id;
END;;

DELIMITER ;


DROP PROCEDURE IF EXISTS accept_shared_label;
DELIMITER ;;

CREATE PROCEDURE accept_shared_label(
    IN f_email VARCHAR(100),
    IN f_text_content TEXT,
    IN f_image_path JSON,
    IN f_audio_path JSON,
    IN f_content_type ENUM('text', 'image', 'audio')
)
BEGIN
    INSERT INTO qr_code_labels (email, text_content, image_path, audio_path, content_type)
    VALUES (f_email, f_text_content, f_image_path, f_audio_path, f_content_type);
    
    SELECT LAST_INSERT_ID() AS newLabelId;
END;;

DELIMITER ;




DROP PROCEDURE IF EXISTS delete_shared_label;
DELIMITER ;;

CREATE PROCEDURE delete_shared_label(
    IN f_shared_id INT
)
BEGIN
    DELETE FROM shared_labels WHERE id = f_shared_id;
END;;

DELIMITER ;




DROP PROCEDURE IF EXISTS get_shared_labels;
DELIMITER ;;

CREATE PROCEDURE get_shared_labels(
    IN f_recipient_email VARCHAR(100)
)
BEGIN
    SELECT 
        s.id AS shared_id, 
        s.original_label_id, 
        l.label_id,
        l.text_content, 
        l.image_path, 
        l.audio_path, 
        l.content_type, 
        s.sender_email, 
        s.shared_date
    FROM 
        shared_labels s
    INNER JOIN 
        qr_code_labels l ON l.label_id = s.original_label_id
    WHERE 
        s.recipient_email = f_recipient_email;
END ;;

DELIMITER ;




DROP PROCEDURE IF EXISTS share_label;
DELIMITER ;;

CREATE PROCEDURE share_label(
    IN f_label_id INT,
    IN f_sender_email VARCHAR(100),
    IN f_recipient_email VARCHAR(100)
)
BEGIN
    INSERT INTO shared_labels (original_label_id, sender_email, recipient_email)
    VALUES (f_label_id, f_sender_email, f_recipient_email);
END ;;

DELIMITER ; 





/* DROP PROCEDURE IF EXISTS get_shared_labels;
DELIMITER ;;

CREATE PROCEDURE get_shared_labels(
    IN p_recipient_email VARCHAR(100)
)
BEGIN
    SELECT l.label_id, l.text_content, l.image_path, l.audio_path, l.content_type, s.sender_email, s.shared_date
    FROM qr_code_labels l
    INNER JOIN shared_labels s ON l.label_id = s.cloned_label_id
    WHERE s.recipient_email = p_recipient_email;
END ;;

DELIMITER ; */




/* DROP PROCEDURE IF EXISTS share_label;
DELIMITER ;;

CREATE PROCEDURE share_label(
    IN f_label_id INT,
    IN f_sender_email VARCHAR(100),
    IN f_recipient_email VARCHAR(100)
)
BEGIN

    DECLARE new_label_id INT;

    INSERT INTO qr_code_labels (email, text_content, image_path, audio_path, content_type, is_label_private)
    SELECT f_recipient_email, text_content, image_path, audio_path, content_type, is_label_private
    FROM qr_code_labels
    WHERE label_id = f_label_id;

    SET new_label_id = LAST_INSERT_ID();

    INSERT INTO shared_labels (original_label_id, cloned_label_id, sender_email, recipient_email)
    VALUES (f_label_id, new_label_id, f_sender_email, f_recipient_email);
END ;;

DELIMITER ; 
 */




DROP PROCEDURE IF EXISTS delete_label;
DELIMITER ;;

CREATE PROCEDURE delete_label(
    IN f_label_id INT)
BEGIN
    DECLARE label_exists INT;
    SET label_exists = (SELECT COUNT(*) FROM qr_code_labels WHERE label_id = f_label_id);

    IF label_exists > 0 THEN
        DELETE FROM qr_code_labels WHERE label_id = f_label_id;
        SELECT 'Label successfully deleted' AS message;
    ELSE
        SELECT 'Label not found' AS message;
    END IF;
END ;;

DELIMITER ;



DROP PROCEDURE IF EXISTS update_label;
DELIMITER ;;

CREATE PROCEDURE update_label(
    IN f_label_id INT,
    IN f_text_content TEXT,
    IN f_image_path VARCHAR(255),
    IN f_audio_path JSON,
    IN f_is_label_private BOOLEAN
)
BEGIN
    UPDATE qr_code_labels
    SET 
        text_content = f_text_content,
        image_path = f_image_path,
        audio_path = f_audio_path,
        is_label_private = f_is_label_private
    WHERE 
        label_id = f_label_id;
END ;;

DELIMITER ;



DROP PROCEDURE IF EXISTS get_specific_label_by_user;
DELIMITER ;;

CREATE PROCEDURE get_specific_label_by_user(
    IN f_label_id INT,
    IN f_email VARCHAR(100)
)
BEGIN
    SELECT
        label_id, 
        text_content, 
        image_path, 
        audio_path, 
        content_type,
        verification_code,
        is_user_verified, 
        is_label_private
    FROM 
    qr_code_labels
    WHERE
        email = f_email AND label_id = f_label_id;
END;;

DELIMITER ;





DROP PROCEDURE IF EXISTS get_labels_by_user;
DELIMITER ;;

CREATE PROCEDURE get_labels_by_user(
    IN f_email VARCHAR(100)
)
BEGIN
    SELECT 
        label_id, 
        text_content, 
        image_path, 
        audio_path, 
        content_type,
        verification_code,
        is_user_verified, 
        is_label_private
    FROM 
        qr_code_labels
    WHERE 
        email = f_email;
END;;

DELIMITER ;





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
    IN f_label_name VARCHAR(15),
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

    INSERT INTO qr_code_labels (email, label_name, text_content, image_path, audio_path, content_type, is_label_private)
    VALUES (f_email, f_label_name, f_text_content, f_image_path, f_audio_path, v_content_type, f_is_label_private);

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

