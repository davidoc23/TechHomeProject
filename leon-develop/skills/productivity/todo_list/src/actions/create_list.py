from bridges.python.src.sdk.leon import leon
from bridges.python.src.sdk.types import ActionParams
from bridges.python.src.sdk.widget import WidgetOptions
from ..widgets.todos_list_widget import TodosListWidget
from ..lib import memory

from typing import Union

def run(params: ActionParams) -> None:
    """Create a to-do list"""

    list_name: Union[str, None] = None

    for item in params['entities']:
        if item['entity'] == 'list':
            list_name = item['sourceText'].lower()

    if list_name is None:
        return leon.answer({'key': 'list_not_provided'})

    if memory.has_todo_list(list_name):
        return leon.answer({
            'key': 'list_already_exists',
            'data': {
                'list': list_name
            }
        })

    todos_list_widget = TodosListWidget(WidgetOptions())
    memory.create_todo_list(
        todos_list_widget.id,
        list_name
    )

    leon.answer({
        'key': 'list_created',
        'data': {
            'list': list_name
        }
    })
