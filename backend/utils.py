from datetime import time
import re

def parse_time_string(time_str: str) -> tuple[time, time]:
    """
    Takes a KFU time string like "0900 - 1015" or "1300 - 1415"
    And returns a tuple of native Python time objects: (time(9, 0), time(10, 15))
    """
    # Clean up any accidental whitespace and ensure it matches the 4-digit pattern
    cleaned = time_str.replace(" ", "")
    match = re.match(r"(\d{4})-(\d{4})", cleaned)
    
    if not match:
        # Default fallback if the university sends a blank or "TBA" time string
        return time(0, 0), time(0, 0)
        
    start_raw, end_raw = match.groups()
    
    # Convert "0900" into hour=9, minute=0
    start_time = time(hour=int(start_raw[:2]), minute=int(start_raw[2:]))
    end_time = time(hour=int(end_raw[:2]), minute=int(end_raw[2:]))
    
    return start_time, end_time


def clean_days_string(days_str: str) -> str:
    """
    Takes a messy spacing string like "ح   خ" (Sunday, Thursday)
    And compresses it to a clean, standardized format like "ح,خ"
    
    """
    if not days_str or days_str.strip() == "":
        return "TBA"
        
    # Split by any number of spaces and rejoin with commas
    day_list = [day.strip() for day in days_str.split() if day.strip()]
    return ",".join(day_list)