from bridges.python.src.sdk.leon import leon
from bridges.python.src.sdk.types import ActionParams
from bridges.python.src.sdk.widget import WidgetOptions
from ..widgets.todos_list_widget import TodosListWidget, TodosListWidgetParams
from ..lib import memory

from typing import Union

def run(params: ActionParams) -> None:
    """Add todos to a to-do list"""

    list_name: Union[str, None] = None
    todos: list[str] = []

    for item in params['entities']:
        if item['entity'] == 'list':
            list_name = item['sourceText'].lower()
        elif item['entity'] == 'todos':
            todos = [chunk.strip() for chunk in item['sourceText'].lower().split(',')]

    if list_name is None:
        return leon.answer({'key': 'list_not_provided'})

    if len(todos) == 0:
        return leon.answer({'key': 'todos_not_provided'})

    widget_id = None
    if not memory.has_todo_list(list_name):
        todos_list_widget = TodosListWidget(WidgetOptions())
        widget_id = todos_list_widget.id
        memory.create_todo_list(
            widget_id,
            list_name
        )
        memory.create_todo_list(widget_id, list_name)
    else:
        widget_id = memory.get_todo_list_by_name(list_name)['widget_id']

    result: str = ''
    for todo in todos:
        memory.create_todo_item(widget_id, list_name, todo)
        result += str(leon.set_answer_data('list_todo_element', {'todo': todo}))

    # Get the updated list of todos
    list_todos = memory.get_todo_items(None, list_name)

    todos_list_options: WidgetOptions[TodosListWidgetParams] = WidgetOptions(
        wrapper_props={'noPadding': True},
        params={'list_name': list_name, 'todos': list_todos},
        on_fetch={
            'widget_id': list_todos[0]['widget_id'],
            'action_name': 'view_list'
        }
    )
    todos_list_widget = TodosListWidget(todos_list_options)

    leon.answer({'widget': todos_list_widget})
