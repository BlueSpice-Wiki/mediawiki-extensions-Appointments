<?php

namespace MediaWiki\Extension\Appointments\Utils;

use MediaWiki\Extension\Appointments\Entity\Appointment;
use MediaWiki\Extension\Appointments\Entity\Calendar;
use MediaWiki\Permissions\Authority;
use MediaWiki\Permissions\PermissionManager;

readonly class Permissions {

	/**
	 * @param PermissionManager $permissionManager
	 * @param UserResolver $userResolver
	 */
	public function __construct(
		private PermissionManager $permissionManager,
		private UserResolver $userResolver
	) {
	}

	/**
	 * @param Authority $actor
	 * @return bool
	 */
	public function canChangeCalendarPermissions( Authority $actor ): bool {
		return $this->permissionManager->userHasRight( $actor->getUser(), 'manage-appointments' ) &&
			$this->permissionManager->userHasRight( $actor->getUser(), 'change-appointment-permissions' );
	}

	/**
	 * @param Authority $actor
	 * @param Appointment $appointment
	 * @param Calendar $calendar
	 * @return bool
	 */
	public function canModifyAppointment( Authority $actor, Appointment $appointment, Calendar $calendar ): bool {
		return $this->isCreator( $actor, $appointment ) || $this->canModifyCalendar( $actor, $calendar );
	}

	/**
	 * @param Authority $actor
	 * @param Calendar|null $calendar
	 * @return bool
	 */
	public function canCreateAppointment( Authority $actor, ?Calendar $calendar ): bool {
		return $calendar ? $this->canModifyCalendar( $actor, $calendar ) :
			$this->permissionManager->userHasRight( $actor->getUser(), 'manage-appointments' );
	}

	/**
	 * @param Authority $actor
	 * @param Appointment $appointment
	 * @param Calendar $calendar
	 * @return bool
	 */
	public function canDeleteAppointment( Authority $actor, Appointment $appointment, Calendar $calendar ): bool {
		return $this->isCreator( $actor, $appointment ) || $this->canModifyCalendar( $actor, $calendar );
	}

	/**
	 * @param Authority $actor
	 * @param Calendar $calendar
	 * @return bool
	 */
	public function canReadCalendar( Authority $actor, Calendar $calendar ): bool {
		if ( $this->canChangeCalendarPermissions( $actor ) ) {
			return true;
		}
		$calendarPermissions = $calendar->data['access'] ?? null;
		$calendarAccessResult = $this->getCalendarAccessResult( $calendarPermissions, $actor, 'read' );
		return $calendarAccessResult !== 'deny';
	}

	/**
	 * @param Authority $actor
	 * @param Calendar $calendar
	 * @return bool
	 */
	public function canModifyCalendar( Authority $actor, Calendar $calendar ): bool {
		return $this->canPerformCalendarOperation( $actor, $calendar, 'edit' );
	}

	/**
	 * @param Authority $actor
	 * @param Calendar $calendar
	 * @return bool
	 */
	public function canDeleteCalendar( Authority $actor, Calendar $calendar ): bool {
		return $this->canPerformCalendarOperation( $actor, $calendar, 'delete' );
	}

	/**
	 * @param Authority $actor
	 * @param Calendar $calendar
	 * @param string $op
	 * @return bool
	 */
	private function canPerformCalendarOperation( Authority $actor, Calendar $calendar, string $op ) {
		if ( $this->canChangeCalendarPermissions( $actor ) ) {
			// User has global permission to change permissions, therefore can perform all operations
			return true;
		}
		if ( !$this->permissionManager->userHasRight( $actor->getUser(), 'manage-appointments' ) ) {
			// No minimal permission, deny immediately
			return false;
		}
		$calendarPermissions = $calendar->data['access'] ?? null;
		$calendarAccessResult = $this->getCalendarAccessResult( $calendarPermissions, $actor, $op );
		if ( $calendarAccessResult === 'grant' ) {
			return true;
		}
		return false;
	}

	/**
	 * @param Authority $actor
	 * @return bool
	 */
	public function canCreateCalendar( Authority $actor ): bool {
		return $this->permissionManager->userHasRight( $actor->getUser(), 'manage-appointments' );
	}

	/**
	 * @param Authority $actor
	 * @return bool
	 */
	public function canModifyEventTypes( Authority $actor ): bool {
		return $this->permissionManager->userHasRight( $actor->getUser(), 'manage-appointments' );
	}

	/**
	 * @param Authority $actor
	 * @return bool
	 */
	public function canDeleteEventTypes( Authority $actor ): bool {
		return $this->permissionManager->userHasRight( $actor->getUser(), 'manage-appointments' );
	}

	/**
	 * @param Authority $actor
	 * @param Appointment|Calendar $entity
	 * @return bool
	 */
	private function isCreator( Authority $actor, Appointment|Calendar $entity ): bool {
		return $actor->getUser()->isRegistered() &&
			$actor->getUser()->getId() === $entity->creator->getId();
	}

	/**
	 * @param array|null $access
	 * @param Authority $actor
	 * @param string $op
	 * @return string
	 */
	private function getCalendarAccessResult( ?array $access, Authority $actor, string $op ): string {
		if ( !is_array( $access ) ) {
			return 'abstain';
		}
		if ( ( $access['type'] ?? 'none' ) === 'none' ) {
			return 'abstain';
		}
		if ( $access['type'] === 'edit' && $op === 'read' ) {
			// Read not controlled
			return 'abstain';
		}

		if ( $op === 'read' ) {
			return $this->userIsIn( $actor, $access['readers'] ?? [] ) ? 'grant' : 'deny';
		}
		if ( $op === 'edit' ) {
			return $this->userIsIn( $actor, $access['editors'] ?? [] ) ? 'grant' : 'deny';
		}
		if ( $op === 'delete' ) {
			return $this->userIsIn( $actor, $access['editors'] ?? [] ) ? 'grant' : 'deny';
		}

		return 'abstain';
	}

	/**
	 * @param Authority $actor
	 * @param array $allowed
	 * @return bool
	 */
	private function userIsIn( Authority $actor, array $allowed ): bool {
		if ( empty( $allowed ) ) {
			// nothing set, allow all
			return true;
		}
		foreach ( $allowed as $allowedEntity ) {
			$resolved = $this->userResolver->resolveToUsersFromData( $allowedEntity );
			foreach ( $resolved as $user ) {
				if ( $user->getId() === $actor->getUser()->getId() ) {
					return true;
				}
			}
		}
		return false;
	}
}
