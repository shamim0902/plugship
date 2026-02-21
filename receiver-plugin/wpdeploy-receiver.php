<?php
/**
 * Plugin Name: WPDeploy Receiver
 * Plugin URI: https://github.com/wpdeploy/receiver
 * Description: Companion plugin for the wpdeploy CLI. Adds a REST endpoint to receive and install plugin ZIP files.
 * Version: 1.0.0
 * Author: WPDeploy
 * License: MIT
 * Requires at least: 5.8
 * Requires PHP: 7.4
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'rest_api_init', function () {
	register_rest_route( 'wpdeploy/v1', '/status', array(
		'methods'             => 'GET',
		'callback'            => 'wpdeploy_status',
		'permission_callback' => 'wpdeploy_check_permissions',
	) );

	register_rest_route( 'wpdeploy/v1', '/deploy', array(
		'methods'             => 'POST',
		'callback'            => 'wpdeploy_deploy',
		'permission_callback' => 'wpdeploy_check_permissions',
	) );
} );

function wpdeploy_check_permissions() {
	return current_user_can( 'install_plugins' );
}

function wpdeploy_status() {
	return new WP_REST_Response( array(
		'status'  => 'ok',
		'version' => '1.0.0',
		'wp'      => get_bloginfo( 'version' ),
		'php'     => PHP_VERSION,
	), 200 );
}

function wpdeploy_deploy( WP_REST_Request $request ) {
	$files = $request->get_file_params();

	if ( empty( $files['plugin'] ) ) {
		return new WP_Error(
			'missing_file',
			'No plugin ZIP file provided.',
			array( 'status' => 400 )
		);
	}

	$file = $files['plugin'];

	if ( $file['error'] !== UPLOAD_ERR_OK ) {
		return new WP_Error(
			'upload_error',
			'File upload failed with error code: ' . $file['error'],
			array( 'status' => 400 )
		);
	}

	$mime = mime_content_type( $file['tmp_name'] );
	if ( ! in_array( $mime, array( 'application/zip', 'application/x-zip-compressed', 'application/octet-stream' ), true ) ) {
		return new WP_Error(
			'invalid_file_type',
			'Uploaded file is not a valid ZIP archive.',
			array( 'status' => 400 )
		);
	}

	require_once ABSPATH . 'wp-admin/includes/file.php';
	require_once ABSPATH . 'wp-admin/includes/plugin-install.php';
	require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
	require_once ABSPATH . 'wp-admin/includes/plugin.php';

	// Move uploaded file to a temporary location WP can access.
	$tmp_path = wp_tempnam( $file['name'] );
	if ( ! move_uploaded_file( $file['tmp_name'], $tmp_path ) ) {
		return new WP_Error(
			'move_failed',
			'Failed to move uploaded file.',
			array( 'status' => 500 )
		);
	}

	$skin     = new WP_Ajax_Upgrader_Skin();
	$upgrader = new Plugin_Upgrader( $skin );

	$result = $upgrader->install( $tmp_path, array(
		'overwrite_package' => true,
	) );

	@unlink( $tmp_path );

	if ( is_wp_error( $result ) ) {
		return new WP_Error(
			'install_failed',
			$result->get_error_message(),
			array( 'status' => 500 )
		);
	}

	if ( $result === false ) {
		$errors = $skin->get_errors();
		$msg    = is_wp_error( $errors ) ? $errors->get_error_message() : 'Plugin installation failed.';
		return new WP_Error(
			'install_failed',
			$msg,
			array( 'status' => 500 )
		);
	}

	// Get installed plugin info.
	$plugin_file = $upgrader->plugin_info();
	$plugin_data = array();
	$activated   = false;

	if ( $plugin_file ) {
		$plugin_data = get_plugin_data( WP_PLUGIN_DIR . '/' . $plugin_file );

		$activate = $request->get_param( 'activate' );
		if ( $activate !== 'false' && $activate !== false ) {
			$activate_result = activate_plugin( $plugin_file );
			$activated       = ! is_wp_error( $activate_result );
		}
	}

	return new WP_REST_Response( array(
		'success'   => true,
		'plugin'    => $plugin_file,
		'name'      => $plugin_data['Name'] ?? '',
		'version'   => $plugin_data['Version'] ?? '',
		'activated' => $activated,
	), 200 );
}
