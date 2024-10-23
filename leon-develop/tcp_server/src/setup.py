from cx_Freeze import setup, Executable
import sys
import os
import sysconfig

from version import __version__
from lib.constants import TMP_PATH

"""
Increase the recursion limit to avoid RecursionError
@see: https://github.com/marcelotduarte/cx_Freeze/issues/2240
"""
sys.setrecursionlimit(sys.getrecursionlimit() * 10)

"""
Delete content of all temporary directory. Only keep ".gitkeep" file.
"""
print(f"Deleting content of {TMP_PATH}")
for root, dirs, files in os.walk(TMP_PATH):
    for file in files:
        if file != '.gitkeep':
            os.remove(os.path.join(root, file))
print(f"Deleted content of {TMP_PATH}")

"""
Instead of injecting everything from a package,
it's recommended to only include the necessary files via the
"include_files" property.
"""
options = {
    'build_exe': {
        'packages': [
            'spacy',
            'en_core_web_trf',
            'fr_core_news_md',
            'pycrfsuite'
        ],
        'includes': [
            'srsly.msgpack.util',
            'blis',
            'cymem'
        ],
        'include_files': [
        ]
    }
}

# Include NVIDIA libraries for non-macOS platforms
if 'macos' not in sysconfig.get_platform():
    options['build_exe']['include_files'] = [
        *options['build_exe']['include_files'],
        ('tcp_server/src/.venv/lib/python3.11/site-packages/nvidia/cudnn/lib', 'lib/nvidia/cudnn/lib')
    ]

# Include private libraries from the tokenizers package for Linux
# if 'linux' in sysconfig.get_platform():
#     options['build_exe']['include_files'] = [
#         *options['build_exe']['include_files'],
#         ('tcp_server/src/.venv/lib/python3.11/site-packages/tokenizers.libs', 'lib/tokenizers.libs')
#     ]

executables = [
    Executable(
        script='tcp_server/src/main.py',
        target_name='leon-tcp-server'
    )
]

setup(
    name='leon-tcp-server',
    version=__version__,
    executables=executables,
    options=options
)
