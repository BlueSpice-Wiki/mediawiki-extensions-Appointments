<?php

namespace MediaWiki\Extension\Appointments\Utils;

use MediaWiki\Extension\Appointments\Entity\Appointment;
use MediaWiki\Extension\Appointments\Entity\Calendar;
use MediaWiki\Permissions\Authority;
use MediaWiki\Permissions\PermissionManager;

readonly class Permissions {

	public function __construct(
		private PermissionManager $permissionManager
	) {
	}

	public function canModifyAppointment( Authority $actor, Appointment $appointment, Calendar $calendar ): bool {
		if ( $this->isCreator( $actor, $appointment ) ) {
			return true;
		}
		return true;
	}

	public function canCreateAppointment( Authority $actor, Calendar $calendar ): bool {
		return true;
	}

	public function canDeleteAppointment( Authority $actor, Appointment $appointment, Calendar $calendar ): bool {
		if ( $this->isCreator( $actor, $appointment ) ) {
			return true;
		}
		return true;
	}

	public function canModifyCalendar( Authority $actor, Calendar $calendar ): bool {
		if ( $this->isCreator( $actor, $calendar ) ) {
			return true;
		}
		return true;
	}

	public function canDeleteCalendar( Authority $actor, Calendar $calendar ): bool {
		if ( $this->isCreator( $actor, $calendar ) ) {
			return true;
		}
		return true;
	}

	public function canCreateCalendar( Authority $actor ): bool {
		return true;
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
}