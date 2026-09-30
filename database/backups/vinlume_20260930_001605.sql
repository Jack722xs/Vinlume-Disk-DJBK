/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-11.4.13-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: vinlume
-- ------------------------------------------------------
-- Server version	11.4.13-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Table structure for table `artista`
--

DROP TABLE IF EXISTS `artista`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `artista` (
  `codigo` bigint(20) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `creado` datetime(6) NOT NULL,
  PRIMARY KEY (`codigo`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `artista`
--

LOCK TABLES `artista` WRITE;
/*!40000 ALTER TABLE `artista` DISABLE KEYS */;
INSERT INTO `artista` VALUES
(1,'Rage Against the Machine','2026-09-30 01:18:51.770907'),
(2,'Twenty One Pilots','2026-09-30 01:18:51.774183'),
(3,'Los Bunkers','2026-09-30 01:18:51.776744'),
(4,'Ado','2026-09-30 01:18:51.779272'),
(5,'Bikini Kill','2026-09-30 01:18:51.781694'),
(6,'Cuarteto de Nos','2026-09-30 01:18:51.786274');
/*!40000 ALTER TABLE `artista` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_group`
--

DROP TABLE IF EXISTS `auth_group`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_group` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_group`
--

LOCK TABLES `auth_group` WRITE;
/*!40000 ALTER TABLE `auth_group` DISABLE KEYS */;
/*!40000 ALTER TABLE `auth_group` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_group_permissions`
--

DROP TABLE IF EXISTS `auth_group_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_group_permissions` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `group_id` int(11) NOT NULL,
  `permission_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_group_permissions_group_id_permission_id_0cd325b0_uniq` (`group_id`,`permission_id`),
  KEY `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` (`permission_id`),
  CONSTRAINT `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`),
  CONSTRAINT `auth_group_permissions_group_id_b120cbf9_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_group_permissions`
--

LOCK TABLES `auth_group_permissions` WRITE;
/*!40000 ALTER TABLE `auth_group_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `auth_group_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_permission`
--

DROP TABLE IF EXISTS `auth_permission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_permission` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `content_type_id` int(11) NOT NULL,
  `codename` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_permission_content_type_id_codename_01ab375a_uniq` (`content_type_id`,`codename`),
  CONSTRAINT `auth_permission_content_type_id_2f476e4b_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_permission`
--

LOCK TABLES `auth_permission` WRITE;
/*!40000 ALTER TABLE `auth_permission` DISABLE KEYS */;
INSERT INTO `auth_permission` VALUES
(1,'Can add log entry',1,'add_logentry'),
(2,'Can change log entry',1,'change_logentry'),
(3,'Can delete log entry',1,'delete_logentry'),
(4,'Can view log entry',1,'view_logentry'),
(5,'Can add permission',3,'add_permission'),
(6,'Can change permission',3,'change_permission'),
(7,'Can delete permission',3,'delete_permission'),
(8,'Can view permission',3,'view_permission'),
(9,'Can add group',2,'add_group'),
(10,'Can change group',2,'change_group'),
(11,'Can delete group',2,'delete_group'),
(12,'Can view group',2,'view_group'),
(13,'Can add user',4,'add_user'),
(14,'Can change user',4,'change_user'),
(15,'Can delete user',4,'delete_user'),
(16,'Can view user',4,'view_user'),
(17,'Can add content type',5,'add_contenttype'),
(18,'Can change content type',5,'change_contenttype'),
(19,'Can delete content type',5,'delete_contenttype'),
(20,'Can view content type',5,'view_contenttype'),
(21,'Can add session',6,'add_session'),
(22,'Can change session',6,'change_session'),
(23,'Can delete session',6,'delete_session'),
(24,'Can view session',6,'view_session'),
(25,'Can add Artista',7,'add_artista'),
(26,'Can change Artista',7,'change_artista'),
(27,'Can delete Artista',7,'delete_artista'),
(28,'Can view Artista',7,'view_artista'),
(29,'Can add Disco',8,'add_disco'),
(30,'Can change Disco',8,'change_disco'),
(31,'Can delete Disco',8,'delete_disco'),
(32,'Can view Disco',8,'view_disco'),
(33,'Can add Mensaje',9,'add_mensaje'),
(34,'Can change Mensaje',9,'change_mensaje'),
(35,'Can delete Mensaje',9,'delete_mensaje'),
(36,'Can view Mensaje',9,'view_mensaje');
/*!40000 ALTER TABLE `auth_permission` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_user`
--

DROP TABLE IF EXISTS `auth_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_user` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `password` varchar(128) NOT NULL,
  `last_login` datetime(6) DEFAULT NULL,
  `is_superuser` tinyint(1) NOT NULL,
  `username` varchar(150) NOT NULL,
  `first_name` varchar(150) NOT NULL,
  `last_name` varchar(150) NOT NULL,
  `email` varchar(254) NOT NULL,
  `is_staff` tinyint(1) NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `date_joined` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_user`
--

LOCK TABLES `auth_user` WRITE;
/*!40000 ALTER TABLE `auth_user` DISABLE KEYS */;
INSERT INTO `auth_user` VALUES
(1,'pbkdf2_sha256$1500000$EGLszvM5K7dhYuFbfm59LH$CNgw/++zDcMP4CWP0efeXgrXpUv7QbhOva6VhLb0utA=',NULL,1,'jack','','','jacsongrc@gmail.com',1,1,'2026-09-30 01:19:23.676491'),
(2,'pbkdf2_sha256$1500000$JJrMg2KN7E2bxND7uTf1nY$LOv6OAZugBjUjYXEUJp/U1t1nOx3TjWEz6jhIAnIr50=','2026-09-30 01:21:12.042007',0,'jack@gmail.com','jack','','jack@gmail.com',0,1,'2026-09-30 01:21:11.671171');
/*!40000 ALTER TABLE `auth_user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_user_groups`
--

DROP TABLE IF EXISTS `auth_user_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_user_groups` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `group_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_user_groups_user_id_group_id_94350c0c_uniq` (`user_id`,`group_id`),
  KEY `auth_user_groups_group_id_97559544_fk_auth_group_id` (`group_id`),
  CONSTRAINT `auth_user_groups_group_id_97559544_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`),
  CONSTRAINT `auth_user_groups_user_id_6a12ed8b_fk_auth_user_id` FOREIGN KEY (`user_id`) REFERENCES `auth_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_user_groups`
--

LOCK TABLES `auth_user_groups` WRITE;
/*!40000 ALTER TABLE `auth_user_groups` DISABLE KEYS */;
/*!40000 ALTER TABLE `auth_user_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_user_user_permissions`
--

DROP TABLE IF EXISTS `auth_user_user_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_user_user_permissions` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `permission_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_user_user_permissions_user_id_permission_id_14a6b632_uniq` (`user_id`,`permission_id`),
  KEY `auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm` (`permission_id`),
  CONSTRAINT `auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`),
  CONSTRAINT `auth_user_user_permissions_user_id_a95ead1b_fk_auth_user_id` FOREIGN KEY (`user_id`) REFERENCES `auth_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_user_user_permissions`
--

LOCK TABLES `auth_user_user_permissions` WRITE;
/*!40000 ALTER TABLE `auth_user_user_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `auth_user_user_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `disco`
--

DROP TABLE IF EXISTS `disco`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `disco` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `titulo` varchar(120) NOT NULL,
  `etiquetas` varchar(100) DEFAULT NULL,
  `precio` int(10) unsigned NOT NULL CHECK (`precio` >= 0),
  `estado` varchar(1) NOT NULL,
  `imagen` varchar(200) NOT NULL,
  `imagen2` varchar(200) DEFAULT NULL,
  `fechaLanzamiento` date DEFAULT NULL,
  `creado` datetime(6) NOT NULL,
  `artista_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `disco_artista_id_a74a1b75_fk_artista_codigo` (`artista_id`),
  CONSTRAINT `disco_artista_id_a74a1b75_fk_artista_codigo` FOREIGN KEY (`artista_id`) REFERENCES `artista` (`codigo`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `disco`
--

LOCK TABLES `disco` WRITE;
/*!40000 ALTER TABLE `disco` DISABLE KEYS */;
INSERT INTO `disco` VALUES
(1,'Homonimo','Rap Metal, Rock',4990,'d','rage-against-the-machine-homonimo/1.webp','rage-against-the-machine-homonimo/2.webp',NULL,'2026-09-30 01:18:51.772864',1),
(2,'Homonimo','Alternative, Indie Pop',4990,'d','twenty-one-pilots-homonimo/1.webp','twenty-one-pilots-homonimo/2.webp',NULL,'2026-09-30 01:18:51.775529',2),
(3,'Homonimo','Rock Chileno, Indie',4990,'d','los-bunkers-homonimo/1.jpg','los-bunkers-homonimo/2.jpg',NULL,'2026-09-30 01:18:51.778054',3),
(4,'Utattemita','J-Pop, Vocaloid',4990,'d','ado-utattemita/1.jpg','ado-utattemita/2.jpg',NULL,'2026-09-30 01:18:51.780562',4),
(5,'The First Two Records','Punk, Riot Grrrl',4990,'d','bikini-kill-the-first-two-records/1.webp','bikini-kill-the-first-two-records/2.webp',NULL,'2026-09-30 01:18:51.783013',5),
(6,'Habla Tu Espejo','Art Rock, Post-Punk',4990,'d','cuarteto-de-nos-habla-tu-espejo/1.jpg','cuarteto-de-nos-habla-tu-espejo/2.jpg',NULL,'2026-09-30 01:18:51.787554',6),
(7,'Blurryface','Alternative, Hip Hop',4990,'d','twenty-one-pilots-blurryface/1.jpg','twenty-one-pilots-blurryface/2.jpg',NULL,'2026-09-30 01:18:51.789124',2),
(8,'Breach','Rock Alternativo, Concept',4990,'d','twenty-one-pilots-breach/1.jpg','twenty-one-pilots-breach/2.jpg',NULL,'2026-09-30 01:18:51.790640',2);
/*!40000 ALTER TABLE `disco` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `django_admin_log`
--

DROP TABLE IF EXISTS `django_admin_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `django_admin_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `action_time` datetime(6) NOT NULL,
  `object_id` longtext DEFAULT NULL,
  `object_repr` varchar(200) NOT NULL,
  `action_flag` smallint(5) unsigned NOT NULL CHECK (`action_flag` >= 0),
  `change_message` longtext NOT NULL,
  `content_type_id` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `django_admin_log_content_type_id_c4bce8eb_fk_django_co` (`content_type_id`),
  KEY `django_admin_log_user_id_c564eba6_fk_auth_user_id` (`user_id`),
  CONSTRAINT `django_admin_log_content_type_id_c4bce8eb_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`),
  CONSTRAINT `django_admin_log_user_id_c564eba6_fk_auth_user_id` FOREIGN KEY (`user_id`) REFERENCES `auth_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `django_admin_log`
--

LOCK TABLES `django_admin_log` WRITE;
/*!40000 ALTER TABLE `django_admin_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `django_admin_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `django_content_type`
--

DROP TABLE IF EXISTS `django_content_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `django_content_type` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `app_label` varchar(100) NOT NULL,
  `model` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `django_content_type_app_label_model_76bd3d3b_uniq` (`app_label`,`model`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `django_content_type`
--

LOCK TABLES `django_content_type` WRITE;
/*!40000 ALTER TABLE `django_content_type` DISABLE KEYS */;
INSERT INTO `django_content_type` VALUES
(1,'admin','logentry'),
(2,'auth','group'),
(3,'auth','permission'),
(4,'auth','user'),
(9,'contactoApp','mensaje'),
(5,'contenttypes','contenttype'),
(6,'sessions','session'),
(7,'tiendaApp','artista'),
(8,'tiendaApp','disco');
/*!40000 ALTER TABLE `django_content_type` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `django_migrations`
--

DROP TABLE IF EXISTS `django_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `django_migrations` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `app` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `applied` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `django_migrations`
--

LOCK TABLES `django_migrations` WRITE;
/*!40000 ALTER TABLE `django_migrations` DISABLE KEYS */;
INSERT INTO `django_migrations` VALUES
(1,'contenttypes','0001_initial','2026-09-30 01:18:28.618658'),
(2,'auth','0001_initial','2026-09-30 01:18:28.894039'),
(3,'admin','0001_initial','2026-09-30 01:18:28.951106'),
(4,'admin','0002_logentry_remove_auto_add','2026-09-30 01:18:28.955245'),
(5,'admin','0003_logentry_add_action_flag_choices','2026-09-30 01:18:28.958392'),
(6,'contenttypes','0002_remove_content_type_name','2026-09-30 01:18:29.000616'),
(7,'auth','0002_alter_permission_name_max_length','2026-09-30 01:18:29.017645'),
(8,'auth','0003_alter_user_email_max_length','2026-09-30 01:18:29.034895'),
(9,'auth','0004_alter_user_username_opts','2026-09-30 01:18:29.038837'),
(10,'auth','0005_alter_user_last_login_null','2026-09-30 01:18:29.063806'),
(11,'auth','0006_require_contenttypes_0002','2026-09-30 01:18:29.065110'),
(12,'auth','0007_alter_validators_add_error_messages','2026-09-30 01:18:29.068588'),
(13,'auth','0008_alter_user_username_max_length','2026-09-30 01:18:29.085659'),
(14,'auth','0009_alter_user_last_name_max_length','2026-09-30 01:18:29.103110'),
(15,'auth','0010_alter_group_name_max_length','2026-09-30 01:18:29.120673'),
(16,'auth','0011_update_proxy_permissions','2026-09-30 01:18:29.124567'),
(17,'auth','0012_alter_user_first_name_max_length','2026-09-30 01:18:29.142338'),
(18,'contactoApp','0001_initial','2026-09-30 01:18:29.151174'),
(19,'sessions','0001_initial','2026-09-30 01:18:29.178294'),
(20,'tiendaApp','0001_initial','2026-09-30 01:18:29.218188');
/*!40000 ALTER TABLE `django_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `django_session`
--

DROP TABLE IF EXISTS `django_session`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `django_session` (
  `session_key` varchar(40) NOT NULL,
  `session_data` longtext NOT NULL,
  `expire_date` datetime(6) NOT NULL,
  PRIMARY KEY (`session_key`),
  KEY `django_session_expire_date_a5c62663` (`expire_date`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `django_session`
--

LOCK TABLES `django_session` WRITE;
/*!40000 ALTER TABLE `django_session` DISABLE KEYS */;
/*!40000 ALTER TABLE `django_session` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mensaje`
--

DROP TABLE IF EXISTS `mensaje`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `mensaje` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(80) NOT NULL,
  `correo` varchar(254) NOT NULL,
  `mensaje` longtext NOT NULL,
  `creado` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mensaje`
--

LOCK TABLES `mensaje` WRITE;
/*!40000 ALTER TABLE `mensaje` DISABLE KEYS */;
/*!40000 ALTER TABLE `mensaje` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-09-30  0:16:05
