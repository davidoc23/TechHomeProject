import random
import sys
from typing import Union
from time import sleep
import json

from .aurora.widget_wrapper import WidgetWrapper
from .types import AnswerInput, AnswerData, AnswerConfig
from .widget_component import SUPPORTED_WIDGET_EVENTS
from ..constants import SKILL_CONFIG, INTENT_OBJECT


class Leon:
    instance: 'Leon' = None

    def __init__(self) -> None:
        if not Leon.instance:
            Leon.instance = self

    @staticmethod
    def set_answer_data(answer_key: str, data: Union[AnswerData, None] = None) -> Union[str, AnswerConfig]:
        """
        Apply data to the answer
        :param answer_key: The answer key
        :param data: The data to apply
        """
        try:
            # In case the answer key is a raw answer
            if SKILL_CONFIG.get('answers') is None or SKILL_CONFIG['answers'].get(answer_key) is None:
                return answer_key

            answers = SKILL_CONFIG['answers'].get(answer_key, '')
            if isinstance(answers, list):
                answer = answers[random.randrange(len(answers))]
            else:
                answer = answers

            if data:
                for key, value in data.items():
                    if isinstance(answer, str):
                        answer = answer.replace(f'%{key}%', str(value))
                    else:
                        if 'text' in answer:
                            answer['text'] = answer['text'].replace(f'%{key}%', str(value))
                        if 'speech' in answer:
                            answer['speech'] = answer['speech'].replace(f'%{key}%', str(value))

            if SKILL_CONFIG.get('variables'):
                variables = SKILL_CONFIG['variables']

                for key, value in variables.items():
                    if isinstance(answer, str):
                        answer = answer.replace(f'%{key}%', str(value))
                    else:
                        if 'text' in answer:
                            answer['text'] = answer['text'].replace(f'%{key}%', str(value))
                        if 'speech' in answer:
                            answer['speech'] = answer['speech'].replace(f'%{key}%', str(value))

            return answer
        except Exception as e:
            print('Error while setting answer data:', e)
            raise e

    def answer(self, answer_input: AnswerInput) -> None:
        """
        Send an answer to the core
        :param answer_input: The answer input
        """
        try:
            key = answer_input.get('key')
            output = {
                'output': {
                    'codes': 'widget' if answer_input.get('widget') and not answer_input.get('key') else answer_input.get('key'),
                    'answer': self.set_answer_data(key, answer_input.get('data')) if key is not None else '',
                    'core': answer_input.get('core')
                }
            }

            widget = answer_input.get('widget')
            if widget is not None:
                wrapper_props = widget.wrapper_props if widget.wrapper_props else {}
                output['output']['widget'] = {
                    'actionName': f"{INTENT_OBJECT['domain']}:{INTENT_OBJECT['skill']}:{INTENT_OBJECT['action']}",
                    'widget': widget.widget,
                    'id': widget.id,
                    'onFetch': widget.on_fetch if hasattr(widget, 'on_fetch') else None,
                    'componentTree': WidgetWrapper({
                        **wrapper_props,
                        'children': [widget.render()]
                    }).__dict__(),
                    'supportedEvents': SUPPORTED_WIDGET_EVENTS
                }

            answer_object = {
                **INTENT_OBJECT,
                **output
            }

            # "Temporize" for the data buffer output on the core
            sleep(0.1)

            sys.stdout.write(json.dumps(answer_object))
            sys.stdout.flush()

        except Exception as e:
            print('Error while creating answer:', e)
            if 'not JSON serializable' in str(e):
                return print("Hint: make sure that widget children components are a list. "
                             "E.g. { 'children': [Text({ 'children': 'Hello' })] }")


leon = Leon()
