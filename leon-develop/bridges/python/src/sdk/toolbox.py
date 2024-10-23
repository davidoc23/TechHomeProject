from typing import Optional
from ..constants import INTENT_OBJECT


def get_widget_id() -> Optional[str]:
    """
    Get the widget ID if any
    """
    for entity in INTENT_OBJECT['current_entities']:
        if entity['entity'] == 'widgetid':
            return entity['sourceText']

    return None
