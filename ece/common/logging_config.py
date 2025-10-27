"""
Logging configuration module for ECE system with multiple log files
"""
import logging
import os
from logging.handlers import RotatingFileHandler
from pathlib import Path


def setup_logging():
    """
    Setup logging configuration for multiple log files:
    - debug_log_ecosystem.txt
    - debug_log_model_inference.txt
    - debug_log_orchestrator.txt
    """
    
    # Create logs directory if it doesn't exist
    logs_dir = Path("logs")
    logs_dir.mkdir(exist_ok=True)
    
    # Create formatters
    detailed_formatter = logging.Formatter(
        '%(asctime)s [%(levelname)s] %(name)s:%(lineno)d - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Setup ecosystem logger
    ecosystem_logger = logging.getLogger('ecosystem')
    ecosystem_logger.setLevel(logging.DEBUG)
    
    ecosystem_handler = RotatingFileHandler(
        logs_dir / 'debug_log_ecosystem.txt',
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5
    )
    ecosystem_handler.setFormatter(detailed_formatter)
    ecosystem_logger.addHandler(ecosystem_handler)
    
    # Setup model inference logger
    model_logger = logging.getLogger('model_inference')
    model_logger.setLevel(logging.DEBUG)
    
    model_handler = RotatingFileHandler(
        logs_dir / 'debug_log_model_inference.txt',
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5
    )
    model_handler.setFormatter(detailed_formatter)
    model_logger.addHandler(model_handler)
    
    # Setup orchestrator logger
    orchestrator_logger = logging.getLogger('orchestrator')
    orchestrator_logger.setLevel(logging.DEBUG)
    
    orchestrator_handler = RotatingFileHandler(
        logs_dir / 'debug_log_orchestrator.txt',
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5
    )
    orchestrator_handler.setFormatter(detailed_formatter)
    orchestrator_logger.addHandler(orchestrator_handler)
    
    # Setup root logger to also log to console
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(detailed_formatter)
    logging.getLogger().addHandler(console_handler)
    logging.getLogger().setLevel(logging.DEBUG)
    
    return {
        'ecosystem': ecosystem_logger,
        'model_inference': model_logger,
        'orchestrator': orchestrator_logger
    }


def get_logger(component_name):
    """
    Get a logger for a specific component
    """
    return logging.getLogger(component_name)


# Initialize logging when module is imported
loggers = setup_logging()