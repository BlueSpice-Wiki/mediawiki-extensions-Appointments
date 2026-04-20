<?php

namespace MediaWiki\Extension\Appointments\Utils;

use MWStake\MediaWiki\Component\InputProcessor\Processor\Trait\ListSplitterTrait;

class EventTypeListValueParam extends EventTypeValueParam {
	use ListSplitterTrait;
}
